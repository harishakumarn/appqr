# AppQR — Project Overview

## What It Is

AppQR is a free, open source tool that generates smart QR codes for mobile apps. A single QR code detects the user's device and redirects iOS users to the App Store and Android users to Google Play. No subscriptions, no third-party servers in the redirect chain, works forever.

---

## The Problem It Solves

Every QR code service charges a monthly subscription for smart device-based redirects. Separate QR codes for each store are available free everywhere, but one smart QR costs $15–40/month on every existing platform. AppQR offers the smart QR as a free, self-hosted tool that the developer owns permanently.

---

## How It Works (Architecture)

```
User scans QR code
↓
Phone opens URL: myapp.com/go/redirect.html?d=BASE64_ENCODED_STORE_URLS
↓
redirect.html runs client-side JS in the browser
reads ?d= parameter, decodes base64url to get both store URLs
detects device via navigator.userAgent
↓
iOS   → redirects to App Store URL
Android → redirects to Play Store URL
```

### Key architectural decisions

1. **redirect.html is data-free** — contains zero campaign data, store URLs, or app-specific information. It is a generic script that decodes URLs from the QR code URL itself. Safe to be publicly accessible on anyone's website.

2. **All campaign data lives in the QR code URL** — both store URLs (with campaign params) are base64url-encoded into the ?d= parameter. The file never needs updating.

3. **No AppQR servers in the redirect chain** — redirect.html is hosted on the developer's own website. AppQR is completely absent after setup. If AppQR shuts down, all QR codes continue working.

4. **Two modes:**
   - Setup (once per app): generates redirect.html + first QR image
   - Campaign (per campaign): generates new QR image only, no file upload needed

---

## URL Validation Rules

- iOS URL must start with: `https://apps.apple.com`
- Android URL must start with: `https://play.google.com/store`
- hostedUrl must be a full HTTPS URL

These are the only URLs accepted. This eliminates spam/abuse risk entirely since App Store and Play Store URLs cannot be used maliciously.

---

## Campaign Tracking

Apple and Google use completely different campaign parameter formats:

**Apple App Store:**
- `ct` = campaign token (your label) e.g. `ct=instagram_launch`
- `pt` = provider token (numeric Apple ID) e.g. `pt=12345`
- `mt` = media type, always `mt=8` for apps

**Google Play (standard UTM):**
- `utm_source` = traffic source e.g. `utm_source=instagram`
- `utm_medium` = marketing medium e.g. `utm_medium=paid`
- `utm_campaign` = campaign name e.g. `utm_campaign=launch`
- `utm_content` = specific ad/creative (optional)
- `utm_term` = keyword for search ads (optional)

Each campaign generates its own QR code with both sets of params encoded separately. The redirect.html automatically forwards the correct params to each store.

---

## Project Structure

```
appqr/
├── public/                        # Vercel static site
│   ├── index.html                 # Landing page
│   ├── generate.html              # Web-based campaign generator for marketers
│   ├── llms.txt                   # AI agent discovery file
│   └── test/
│       └── redirect.html          # Test redirect page hosted on Vercel
├── api/
│   └── ping.js                    # Telemetry serverless function (Vercel)
├── cli/
│   ├── bin/
│   │   └── appqr.js              # CLI entry point
│   ├── src/
│   │   ├── core.js               # Core logic — validation, HTML generation, QR generation
│   │   ├── mcp.mjs               # MCP server for AI agent integration
│   │   ├── telemetry.js          # Anonymous usage counters
│   │   ├── index.js              # npm package exports
│   │   └── index.d.ts            # TypeScript type definitions
│   ├── package.json
│   └── README.md
├── vercel.json                    # Vercel deployment config
├── package.json                   # Root package (API dependencies)
└── README.md                      # GitHub README
```

---

## CLI Interface

```bash
# First time setup — generates redirect.html + qr.png
appqr setup \
  --ios "https://apps.apple.com/app/id123" \
  --android "https://play.google.com/store/apps/details?id=com.app" \
  --url "https://myapp.com/go" \
  --ios-params "ct=launch&pt=12345&mt=8" \
  --android-params "utm_source=launch&utm_campaign=v1&utm_medium=organic" \
  --output ./appqr-output

# New campaign QR — generates qr.png only, no upload needed
appqr campaign \
  --ios "https://apps.apple.com/app/id123" \
  --android "https://play.google.com/store/apps/details?id=com.app" \
  --url "https://myapp.com/go" \
  --ios-params "ct=instagram_launch&pt=12345&mt=8" \
  --android-params "utm_source=instagram&utm_campaign=launch&utm_medium=paid" \
  --output ./qrs/instagram

# Show campaign param formats
appqr params

# Start MCP server for AI agent integration
appqr mcp
```

---

## npm Package API

```javascript
import { setup, campaign, validateIosUrl, validateAndroidUrl } from 'appqr'

// First time setup
const result = await setup({
  ios: 'https://apps.apple.com/app/id123',
  android: 'https://play.google.com/store/apps/details?id=com.app',
  hostedUrl: 'https://myapp.com/go',
  iosParams: 'ct=launch&pt=12345&mt=8',        // optional
  androidParams: 'utm_source=launch&utm_campaign=v1', // optional
  outputPath: './public/go'                      // optional, default ./appqr-output
})
// result.redirectPath — upload this to your site once
// result.qrPath       — your QR image
// result.qrUrl        — the URL encoded in the QR
// result.iosUrl       — full iOS URL with params
// result.androidUrl   — full Android URL with params

// Campaign QR
const qr = await campaign({
  ios: 'https://apps.apple.com/app/id123',
  android: 'https://play.google.com/store/apps/details?id=com.app',
  hostedUrl: 'https://myapp.com/go',
  iosParams: 'ct=instagram_launch&pt=12345&mt=8',
  androidParams: 'utm_source=instagram&utm_campaign=launch&utm_medium=paid',
  outputPath: './qrs/instagram'
})
// qr.qrPath     — your campaign QR image
// qr.qrUrl      — the URL encoded in the QR
// qr.iosUrl     — full iOS URL with campaign params
// qr.androidUrl — full Android URL with campaign params
```

Full TypeScript types included in `index.d.ts`.

---

## MCP Server (AI Agent Integration)

AppQR ships a built-in MCP (Model Context Protocol) server. AI agents that support MCP (Claude, Cursor, GitHub Copilot) can call AppQR natively without CLI knowledge.

### Agent config (Claude Desktop, Cursor)

```json
{
  "mcpServers": {
    "appqr": {
      "command": "npx",
      "args": ["appqr", "mcp"]
    }
  }
}
```

### Tools exposed to agents

| Tool | Description |
|------|-------------|
| `appqr_setup` | First time setup — generates redirect.html + qr.png |
| `appqr_campaign` | New campaign QR — generates qr.png only |
| `appqr_validate` | Validate store URLs before generating |

All tool parameters are typed with Zod schemas so agents receive precise validation errors.

---

## Web Campaign Generator (generate.html)

A browser-based UI for marketers who don't use the CLI.

- App settings (store URLs, redirect URL, Apple provider token) saved in localStorage — filled in once, remembered forever
- Plain English campaign fields: Campaign name, Source, Medium dropdown
- Automatically builds Apple ct/pt/mt params and Google UTM params behind the scenes — marketer never sees raw param format
- Live QR preview and one-click PNG download
- Last 10 campaigns saved in history, click any to reload its QR
- Hosted at: appqr-coral.vercel.app/generate.html

---

## Telemetry

Anonymous, no personal data. Four counters only:

| Counter | When incremented |
|---------|-----------------|
| `installs` | First ever run on a machine |
| `setups` | Every `appqr setup` run |
| `human_runs` | Run from interactive terminal or GUI |
| `agent_runs` | Run from CI or non-TTY environment |
| `qrs_generated` | Every successful QR output |

Agent detection: checks `process.env.CI`, `process.env.CURSOR`, `process.env.GITHUB_ACTIONS`, `!process.stdout.isTTY`.

Opt out: `APPQR_NO_TELEMETRY=1`

Backend: one Vercel serverless function → one Supabase table with one row, five columns.

---

## Agent Discovery

Four layers making AppQR discoverable by AI agents:

1. **llms.txt** at `appqr-coral.vercel.app/llms.txt` — plain English description, full API docs, MCP tool definitions, common agent workflows
2. **TypeScript types** (`index.d.ts`) — full parameter and return type definitions
3. **npm keywords** — includes `agent`, `ai-agent`, `mcp`, `model-context-protocol`, `ai-friendly`, `cursor`, `copilot`
4. **Complete JSDoc** on all functions — `@param`, `@returns`, `@throws`, `@example` blocks

---

## Infrastructure

| Component | Service | Cost |
|-----------|---------|------|
| Landing page + generator | Vercel (free tier) | $0 |
| Telemetry API | Vercel serverless (free tier) | $0 |
| Telemetry database | Supabase (free tier) | $0 |
| npm package | npm registry | $0 |
| Payments (if ever needed) | Gumroad | $0 + 10% per sale |
| **Total** | | **$0/month** |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Core logic | Node.js (CommonJS) |
| QR generation | `qrcode` npm package |
| CLI | `commander` npm package |
| MCP server | `@modelcontextprotocol/sdk` (ESM) |
| Schema validation | `zod` |
| Telemetry backend | Vercel serverless function |
| Telemetry database | Supabase (REST API, no SDK) |
| Landing + generator | Plain HTML, Inter + Fraunces fonts |
| Deployment | Vercel (auto-deploy from GitHub) |

---

## Current Status

- GitHub repo: github.com/harishakumarn/appqr
- Vercel deployment: appqr-coral.vercel.app
- npm: not yet published
- MCP registries: not yet submitted
- Test QR: points to appqr-coral.vercel.app/test/redirect.html using Katha Room app URLs

## Immediate Next Steps

1. Push `public/test/redirect.html` and verify QR redirect works on real devices
2. Publish CLI to npm: `cd cli && npm publish`
3. Submit to mcp.so MCP registry
4. Set up Supabase telemetry and add env vars to Vercel
5. Update `cli/src/telemetry.js` TELEMETRY_URL with actual Vercel URL
6. Update GitHub README with actual Vercel and npm URLs
