import { defineConfig } from "wxt"

export default defineConfig({
  manifest: {
    name: "OctoActions",
    description: "Adds extra actions to GitHub pull requests.",
    permissions: ["storage"],
    host_permissions: ["https://github.com/*"],
    icons: {
      128: "/icon.png",
    },
  },
})
