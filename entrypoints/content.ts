import { approvePr, getPrAuthor, mergePr, parsePrUrl, type PrLocation } from "@/lib/github-api"

export default defineContentScript({
  matches: ["https://github.com/*/pull/*"],
  runAt: "document_idle",

  main() {
    let currentUrl = location.href
    let mounted = false

    async function tryMount() {
      const pr = parsePrUrl(location.href)
      if (!pr) return

      // Find the header actions container
      const actionsContainer =
        document.querySelector<HTMLElement>('[data-component="PH_Actions"]') ??
        document.querySelector<HTMLElement>(
          '[class*="PageHeader-Actions"]'
        ) ??
        document.querySelector<HTMLElement>(".gh-header-actions")

      if (!actionsContainer) return
      if (actionsContainer.querySelector(".octoactions-btn")) return

      const currentUser = document
        .querySelector('meta[name="user-login"]')
        ?.getAttribute("content")
      const prAuthor = await getPrAuthor(pr)
      const isOwnPr = currentUser === prAuthor

      if (!isOwnPr) {
        actionsContainer.append(createApproveButton(pr))
      }
      actionsContainer.append(createMergeButton(pr))
      mounted = true
    }

    // Monitor for SPA navigations and DOM changes
    const observer = new MutationObserver(() => {
      if (location.href !== currentUrl) {
        currentUrl = location.href
        mounted = false
      }
      if (!mounted) tryMount()
    })

    observer.observe(document.body, { childList: true, subtree: true })
    tryMount()
  },
})

// Checkmark icon (approve)
const CHECK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="octicon">
  <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
</svg>`

// Git merge icon
const MERGE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="octicon">
  <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
</svg>`

function withAction(
  button: HTMLButtonElement,
  action: () => Promise<void>
) {
  button.addEventListener("click", async () => {
    if (button.disabled) return
    button.disabled = true
    const originalContent = button.innerHTML

    try {
      button.textContent = "…"
      await action()

      button.innerHTML = CHECK_ICON
      button.classList.add("btn-primary")
    } catch (err) {
      button.innerHTML = originalContent
      button.classList.add("btn-danger")

      setTimeout(() => {
        button.className = "btn octoactions-btn"
        button.disabled = false
      }, 3000)
    }
  })
}

function createApproveButton(pr: PrLocation): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "btn octoactions-btn"
  button.title = "Approve"
  button.innerHTML = CHECK_ICON

  withAction(button, () => approvePr(pr))
  return button
}

function createMergeButton(pr: PrLocation): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "btn octoactions-btn"
  button.title = "Merge"
  button.innerHTML = MERGE_ICON

  withAction(button, async () => {
    await mergePr(pr)
    setTimeout(() => location.reload(), 1500)
  })
  return button
}
