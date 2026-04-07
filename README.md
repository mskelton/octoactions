# Octo Actions

A browser extension that adds quick action buttons to GitHub pull requests.

![Screenshot](https://github.com/user-attachments/assets/24f5ac36-3a25-4c19-b479-897a46c16a74)

## Features

- **Draft Toggle** - Convert a PR to/from draft status with one click
- **Approve** - Quickly approve a PR without navigating away
- **Merge** - Enable auto-merge with your preferred merge method (squash, merge, or rebase)

## Setup

1. Install the extension
2. Click the extension icon to open settings
3. Enter a GitHub Personal Access Token with `repo` scope
4. Choose your preferred merge method

## Development

```bash
npm install
npm run dev       # Start dev server with hot reload
npm run build     # Production build
npm run zip       # Create distributable .zip
npm run format    # Format code with oxfmt
```
