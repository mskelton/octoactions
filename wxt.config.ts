import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    name: 'Octo Actions',
    description: 'Adds extra actions to GitHub pull requests.',
    permissions: ['storage'],
    host_permissions: ['https://github.com/*'],
    icons: {
      128: '/icon-128.png',
      512: '/icon-512.png',
    },
    action: {},
  },
})
