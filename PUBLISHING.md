# Publishing to the Chrome Web Store

One-time setup for publishing Octo Actions from your local machine via `npm run release`.

## Prerequisites

- Chrome Web Store developer account ($5 one-time registration fee)
- Google account with access to Google Cloud Console

## Step 1 — Register as a Chrome Web Store developer

1. Go to <https://chrome.google.com/webstore/devconsole>
2. Pay the $5 registration fee (one-time, per Google account)
3. Accept the developer agreement

## Step 2 — Create the extension listing (manual first upload)

The Chrome Web Store API can only **update** existing extensions — the first upload must go through the web UI.

1. Run `npm run zip` — this produces `.output/octoactions-<version>-chrome.zip`
2. In the [developer dashboard](https://chrome.google.com/webstore/devconsole), click **New item**
3. Upload the zip
4. Fill in the required listing info: description, screenshots, category, privacy policy, etc.
5. Submit for review (or save as draft — you just need the listing to exist)
6. Copy the **Extension ID** from the listing URL — you'll paste it in Step 4

## Step 3 — Create OAuth credentials in Google Cloud

1. Go to <https://console.cloud.google.com>
2. Create a new project (e.g. `octoactions-publishing`) or use an existing one
3. Sidebar: **APIs & Services → Library** → search for **Chrome Web Store API** → click **Enable**
4. Sidebar: **APIs & Services → OAuth consent screen**
   - User type: **External**
   - App name: `Octo Actions Publisher` (or anything)
   - User support email + developer contact: your email
   - Skip the scopes page
   - Add your Google account as a **test user**
   - Save
5. Sidebar: **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Desktop app**
   - Name: `Octo Actions CLI`
   - Click **Create**
6. Copy the **Client ID** and **Client secret** — you'll paste them in Step 4

## Step 4 — Run the init wizard

```bash
npm run submit:init
```

This interactive wizard will:
1. Prompt for the extension ID (from Step 2)
2. Prompt for the client ID and secret (from Step 3)
3. Open a browser window for you to sign in and authorize the CLI
4. Generate a refresh token and write everything to `.env.submit` (gitignored)

No manual OAuth Playground dance required.

## Step 5 — Publish

```bash
# Bump version in package.json first, then:
npm run release
```

This runs `wxt zip` followed by `wxt submit`. The submission lands in the Chrome Web Store review queue (typically minutes to a few days).

For subsequent releases: bump `version` in `package.json` and re-run `npm run release`.

## Troubleshooting

- **`invalid_grant` error**: refresh token expired or was revoked. Re-run `npm run submit:init`.
- **`ITEM_NOT_UPDATABLE`**: the manual first upload in Step 2 hasn't been published or saved — revisit the dashboard.
- **Version conflict**: `version` in `package.json` must be strictly greater than the currently published version.
- **Authorization fails in wizard**: confirm your Google account is added as a test user on the OAuth consent screen (Step 3.4).
