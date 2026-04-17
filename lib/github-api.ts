import { storage } from 'wxt/utils/storage'

export interface PrLocation {
  owner: string
  repo: string
  number: number
}

export function parsePrUrl(url: string): PrLocation | null {
  const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) }
}

export abstract class GitHubClient {
  abstract markReadyForReview(pr: PrLocation): Promise<void>
  abstract convertToDraft(pr: PrLocation): Promise<void>
  abstract approve(pr: PrLocation): Promise<void>
  abstract merge(pr: PrLocation): Promise<void>
}

export class ApiClient extends GitHubClient {
  private async getToken(): Promise<string> {
    const token = await storage.getItem<string>('local:github-token')
    if (!token) throw new Error('GitHub token not configured')
    return token
  }

  private async fetch(path: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getToken()
    return fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...options.headers,
      },
    })
  }

  private async getPrNodeId(pr: PrLocation): Promise<string> {
    const res = await this.fetch(`/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`)
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(`Failed to get PR: ${res.status} ${body.message || res.statusText}`)
    }
    const data = await res.json()
    return data.node_id
  }

  private async graphqlMutation(
    query: string,
    variables: Record<string, unknown>,
    errorPrefix: string,
  ): Promise<void> {
    const res = await this.fetch('/graphql', {
      method: 'POST',
      body: JSON.stringify({ query, variables }),
    })

    const body = await res.json()
    if (body.errors?.length) {
      throw new Error(`${errorPrefix}: ${body.errors[0].message}`)
    }
  }

  async markReadyForReview(pr: PrLocation): Promise<void> {
    const pullRequestId = await this.getPrNodeId(pr)
    await this.graphqlMutation(
      `mutation($pullRequestId: ID!) {
        markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
          pullRequest { isDraft }
        }
      }`,
      { pullRequestId },
      'Failed to mark ready',
    )
  }

  async convertToDraft(pr: PrLocation): Promise<void> {
    const pullRequestId = await this.getPrNodeId(pr)
    await this.graphqlMutation(
      `mutation($pullRequestId: ID!) {
        convertPullRequestToDraft(input: { pullRequestId: $pullRequestId }) {
          pullRequest { isDraft }
        }
      }`,
      { pullRequestId },
      'Failed to convert to draft',
    )
  }

  async approve(pr: PrLocation): Promise<void> {
    const res = await this.fetch(
      `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify({ event: 'APPROVE' }),
      },
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(`Failed to approve PR: ${res.status} ${body.message || res.statusText}`)
    }
  }

  async merge(pr: PrLocation): Promise<void> {
    const mergeMethod = (
      (await storage.getItem<string>('local:merge-method')) || 'SQUASH'
    ).toUpperCase()

    const pullRequestId = await this.getPrNodeId(pr)
    const res = await this.fetch('/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query: `mutation($pullRequestId: ID!, $mergeMethod: PullRequestMergeMethod!) {
          enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: $mergeMethod }) {
            pullRequest { autoMergeRequest { enabledAt } }
          }
        }`,
        variables: { pullRequestId, mergeMethod },
      }),
    })

    const body = (await res.json()) as { errors?: { message?: string }[] }
    if (!body.errors?.length) return

    const isCleanStatus = body.errors.some((e) =>
      e.message?.includes('Pull request is in clean status'),
    )

    if (!isCleanStatus) {
      throw new Error(`Failed to enable auto-merge: ${body.errors[0].message}`)
    }

    const mergeRes = await this.fetch(
      `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/merge`,
      {
        method: 'PUT',
        body: JSON.stringify({ merge_method: mergeMethod.toLowerCase() }),
      },
    )

    if (!mergeRes.ok) {
      const mergeBody = await mergeRes.json().catch(() => ({}))
      throw new Error(
        `Failed to merge PR: ${mergeRes.status} ${mergeBody.message || mergeRes.statusText}`,
      )
    }
  }
}

export class UiClient extends GitHubClient {
  private getCsrfToken(): string {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content
    if (meta) return meta
    const input =
      document.querySelector<HTMLInputElement>('input[name="authenticity_token"]')?.value
    if (input) return input
    throw new Error('Unable to locate GitHub CSRF token on page')
  }

  private async submit(
    path: string,
    fields: Record<string, string> = {},
  ): Promise<Response> {
    const data = new FormData()
    data.set('authenticity_token', this.getCsrfToken())
    for (const [k, v] of Object.entries(fields)) data.set(k, v)

    const res = await fetch(`https://github.com${path}`, {
      method: 'POST',
      body: data,
      credentials: 'include',
      headers: { Accept: 'text/html' },
    })
    if (!res.ok) {
      throw new Error(`Request failed: ${res.status} ${res.statusText}`)
    }
    return res
  }

  async markReadyForReview(pr: PrLocation): Promise<void> {
    await this.submit(`/${pr.owner}/${pr.repo}/pull/${pr.number}/ready_for_review`)
  }

  async convertToDraft(pr: PrLocation): Promise<void> {
    await this.submit(`/${pr.owner}/${pr.repo}/pull/${pr.number}/convert_to_draft`)
  }

  async approve(pr: PrLocation): Promise<void> {
    await this.submit(`/${pr.owner}/${pr.repo}/pull/${pr.number}/reviews`, {
      'pull_request_review[event]': 'approve',
      'pull_request_review[body]': '',
    })
  }

  async merge(pr: PrLocation): Promise<void> {
    const mergeMethod = (await storage.getItem<string>('local:merge-method')) || 'squash'
    await this.submit(`/${pr.owner}/${pr.repo}/pull/${pr.number}/merge`, {
      commit_message: '',
      commit_title: '',
      merge_method: mergeMethod.toLowerCase(),
    })
  }
}

export async function getClient(): Promise<GitHubClient> {
  const mode = await storage.getItem<'api' | 'ui'>('local:mode')
  return mode === 'ui' ? new UiClient() : new ApiClient()
}
