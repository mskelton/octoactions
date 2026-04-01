import { defineConfig } from "wxt"

export default defineConfig({
  manifest: {
    name: "OctoActions",
    description: "Adds an Approve & Merge button to GitHub pull requests.",
    permissions: ["storage"],
    host_permissions: ["https://github.com/*", "https://api.github.com/*"],
  },
})
