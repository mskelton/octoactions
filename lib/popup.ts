import { storage } from 'wxt/utils/storage'

const tokenInput = document.getElementById('token') as HTMLInputElement
const mergeMethodSelect = document.getElementById('merge-method') as HTMLSelectElement
const saveButton = document.getElementById('save') as HTMLButtonElement
const statusEl = document.getElementById('status') as HTMLParagraphElement

// Load saved settings
async function loadSettings() {
  const token = await storage.getItem<string>('local:github-token')
  const mergeMethod = await storage.getItem<string>('local:merge-method')

  if (token) tokenInput.value = token
  if (mergeMethod) mergeMethodSelect.value = mergeMethod
}

saveButton.addEventListener('click', async () => {
  await storage.setItem('local:github-token', tokenInput.value)
  await storage.setItem('local:merge-method', mergeMethodSelect.value)

  statusEl.textContent = 'Settings saved!'
  setTimeout(() => {
    statusEl.textContent = ''
  }, 2000)
})

loadSettings()
