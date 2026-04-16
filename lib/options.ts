import { storage } from 'wxt/utils/storage'

type Mode = 'api' | 'ui'

const modeInputs = document.querySelectorAll<HTMLInputElement>('input[name="mode"]')
const tokenCard = document.getElementById('token-card') as HTMLElement
const tokenInput = document.getElementById('token') as HTMLInputElement
const mergeMethodSelect = document.getElementById('merge-method') as HTMLSelectElement
const saveButton = document.getElementById('save') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLSpanElement

function getSelectedMode(): Mode {
  const checked = document.querySelector<HTMLInputElement>('input[name="mode"]:checked')
  return (checked?.value as Mode) || 'api'
}

function applyMode(mode: Mode) {
  tokenCard.hidden = mode === 'ui'
}

async function loadSettings() {
  const [mode, token, mergeMethod] = await Promise.all([
    storage.getItem<Mode>('local:mode'),
    storage.getItem<string>('local:github-token'),
    storage.getItem<string>('local:merge-method'),
  ])

  const resolvedMode: Mode = mode === 'ui' ? 'ui' : 'api'
  const modeInput = document.querySelector<HTMLInputElement>(
    `input[name="mode"][value="${resolvedMode}"]`,
  )
  if (modeInput) modeInput.checked = true
  applyMode(resolvedMode)

  if (token) tokenInput.value = token
  if (mergeMethod) mergeMethodSelect.value = mergeMethod
}

function showStatus(message: string, isError = false) {
  statusEl.textContent = message
  statusEl.classList.toggle('error', isError)
  statusEl.classList.add('visible')
  setTimeout(() => statusEl.classList.remove('visible'), 2000)
}

modeInputs.forEach((input) => {
  input.addEventListener('change', () => applyMode(getSelectedMode()))
})

saveButton.addEventListener('click', async () => {
  const mode = getSelectedMode()
  const token = tokenInput.value.trim()

  if (mode === 'api' && !token) {
    showStatus('A token is required for API mode', true)
    return
  }

  await Promise.all([
    storage.setItem('local:mode', mode),
    storage.setItem('local:github-token', token),
    storage.setItem('local:merge-method', mergeMethodSelect.value),
  ])

  showStatus('Settings saved')
})

loadSettings()
