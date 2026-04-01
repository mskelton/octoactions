import { approvePr, convertToDraft, markReadyForReview, mergePr, parsePrUrl, type PrLocation } from "@/lib/github-api"

export default defineContentScript({
  matches: ["https://github.com/*/pull/*"],
  runAt: "document_idle",

  main() {
    let currentUrl = location.href
    let mounted = false

    function tryMount() {
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

      if (!isOwnPr()) {
        actionsContainer.append(createActionButton({
          title: "Approve",
          icon: CHECK_ICON,
          action: () => approvePr(pr),
        }))
      }

      const draft = isDraftPr()
      actionsContainer.append(createActionButton({
        title: draft ? "Mark as ready" : "Convert to draft",
        icon: draft ? EYE_ICON : EYE_SLASH_ICON,
        action: () => draft ? markReadyForReview(pr) : convertToDraft(pr),
      }))

      actionsContainer.append(createActionButton({
        title: "Merge",
        icon: MERGE_ICON,
        action: () => mergePr(pr),
      }))

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

// Eye icon (ready for review)
const EYE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="octicon">
  <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.677 1.367-1.931 2.637-3.022C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.824.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z"/>
</svg>`

// Eye-slash icon (convert to draft)
const EYE_SLASH_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="octicon">
  <path d="M.143 2.31a.75.75 0 0 1 1.047-.167l14.5 10.5a.75.75 0 1 1-.88 1.214l-2.248-1.628C11.346 13.19 9.792 14 8 14c-1.981 0-3.67-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.797c.353-.533 1.009-1.46 1.942-2.371L.31 3.357A.75.75 0 0 1 .143 2.31Zm3.945 3.245a11 11 0 0 0-2.409 2.377.12.12 0 0 0 0 .136c.412.622 1.242 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.195 0 2.31-.488 3.29-1.191L9.745 10.16A2 2 0 0 1 6.84 7.755ZM8 3.5c-.516 0-1.017.09-1.499.251a.75.75 0 0 1-.473-1.423A6.2 6.2 0 0 1 8 2c1.981 0 3.67.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.11.166-.248.365-.41.587a.75.75 0 1 1-1.21-.887c.148-.201.272-.382.371-.53a.12.12 0 0 0 0-.137c-.412-.621-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5Z"/>
</svg>`

// Git merge icon
const MERGE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="octicon">
  <path d="M5.45 5.154A4.25 4.25 0 0 0 9.25 7.5h1.378a2.251 2.251 0 1 1 0 1.5H9.25A5.734 5.734 0 0 1 5 7.123v3.505a2.25 2.25 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.95-.218ZM4.25 13.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm8.5-4.5a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z"/>
</svg>`

const BUTTON_STYLES = { width: "32px", height: "32px", padding: "0", display: "inline-flex", alignItems: "center", justifyContent: "center" }

function isDraftPr(): boolean {
  const stateLabel = document.querySelector('[title="Status: Draft"], [data-name="draft"]')
  if (stateLabel) return true
  const stateBadge = document.querySelector('.State')
  return stateBadge?.textContent?.trim() === "Draft"
}

function isOwnPr(): boolean {
  const currentUser = document.querySelector<HTMLMetaElement>('meta[name="user-login"]')?.content
  const authorLink = document.querySelector<HTMLAnchorElement>('[class*="PullRequestHeaderSummary"] a[data-hovercard-type="user"]')
  const prAuthor = authorLink?.getAttribute("href")?.replace("/", "")
  return !!currentUser && currentUser === prAuthor
}

function resetButton(button: HTMLButtonElement, innerHTML: string) {
  button.innerHTML = innerHTML
  button.className = "btn octoactions-btn"
  Object.assign(button.style, BUTTON_STYLES)
  button.disabled = false
}

interface ActionButtonOptions {
  title: string
  icon: string
  action: () => Promise<void>
}

function createActionButton({ title, icon, action }: ActionButtonOptions): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.className = "btn octoactions-btn"
  Object.assign(button.style, BUTTON_STYLES)
  button.title = title
  button.innerHTML = icon

  button.addEventListener("click", async () => {
    if (button.disabled) return
    button.disabled = true

    try {
      button.textContent = "…"
      await action()

      button.innerHTML = CHECK_ICON
      button.classList.add("btn-primary")
      setTimeout(() => resetButton(button, icon), 2000)
    } catch {
      resetButton(button, icon)
      button.classList.add("btn-danger")
      setTimeout(() => resetButton(button, icon), 3000)
    }
  })

  return button
}
