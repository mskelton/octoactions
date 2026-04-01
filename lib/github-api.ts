import { storage } from "wxt/utils/storage"

export interface PrLocation {
  owner: string
  repo: string
  number: number
}

export function parsePrUrl(url: string): PrLocation | null {
  const match = url.match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/
  )
  if (!match) return null
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) }
}

async function getToken(): Promise<string | null> {
  const result = await storage.getItem<string>("local:github-token")
  return result || null
}

async function githubFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken()
  if (!token) throw new Error("GitHub token not configured")

  return fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...options.headers,
    },
  })
}

export async function getPrAuthor(pr: PrLocation): Promise<string> {
  const res = await githubFetch(
    `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}`
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `Failed to get PR: ${res.status} ${body.message || res.statusText}`
    )
  }
  const data = await res.json()
  return data.user.login
}

export async function approvePr(pr: PrLocation): Promise<void> {
  const res = await githubFetch(
    `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/reviews`,
    {
      method: "POST",
      body: JSON.stringify({ event: "APPROVE" }),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `Failed to approve PR: ${res.status} ${body.message || res.statusText}`
    )
  }
}

export async function mergePr(pr: PrLocation): Promise<void> {
  const res = await githubFetch(
    `/repos/${pr.owner}/${pr.repo}/pulls/${pr.number}/merge`,
    {
      method: "PUT",
      body: JSON.stringify({
        merge_method:
          (await storage.getItem<string>("local:merge-method")) || "squash",
      }),
    }
  )
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(
      `Failed to merge PR: ${res.status} ${body.message || res.statusText}`
    )
  }
}
