<div align="center">

# AppQR

**One QR code. Detects the device. Sends users to the right store.**

[![npm version](https://img.shields.io/npm/v/appqr?color=ff4d00&style=flat-square)](https://www.npmjs.com/package/appqr)
[![npm downloads](https://img.shields.io/npm/dm/appqr?color=00c896&style=flat-square)](https://www.npmjs.com/package/appqr)
[![license](https://img.shields.io/npm/l/appqr?style=flat-square)](LICENSE)
[![node](https://img.shields.io/node/v/appqr?style=flat-square)](package.json)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue?style=flat-square)](docs/mcp.md)

</div>

---

You made an app. It's on both stores. You need one QR code for your landing page, business card, and press kit. Every other tool charges a monthly subscription for this. **AppQR is free, runs on your machine, and works forever.**

```bash
npx appqr setup \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go"
```

```
✓ redirect.html  →  ./appqr-output/redirect.html
✓ qr.png         →  ./appqr-output/qr.png

→ Upload redirect.html to your site at: https://myapp.com/go
→ Done! For future campaigns, run: appqr campaign
```

---

## How it works

```
Scan QR
  ↓
Phone opens: myapp.com/go?d=eyJpb3MiOiJodHRw...
  ↓
redirect.html detects device (client-side JS, no server)
  ↓
iOS user  → App Store
Android   → Google Play
```

The QR code encodes both store URLs as base64 in the URL itself. `redirect.html` is a tiny generic file that decodes and redirects — it contains **zero campaign data** and never needs to change. Every new campaign just generates a new QR image.

**No AppQR servers are ever in the redirect chain.** Everything runs on the developer's own website.

---

## Install

```bash
npm install -g appqr
```

Or run without installing:

```bash
npx appqr setup ...
```

---

## Usage

### Step 1 — Setup (once per app)

```bash
appqr setup \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go"
```

With campaign tracking on your first QR:

```bash
appqr setup \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go" \
  --ios-params "ct=launch&pt=12345&mt=8" \
  --android-params "utm_source=launch&utm_campaign=v1&utm_medium=organic" \
  --output ./public/go
```

Upload `redirect.html` to your site. That's the only file you ever upload. **Never touch it again.**

---

### Step 2 — New campaign QR (as many times as you want)

```bash
appqr campaign \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go" \
  --ios-params "ct=instagram_launch&pt=12345&mt=8" \
  --android-params "utm_source=instagram&utm_campaign=launch&utm_medium=paid" \
  --output ./qrs/instagram
```

```
✓ qr.png  →  ./qrs/instagram/qr.png

iOS URL:     https://apps.apple.com/app/id123456789?ct=instagram_launch&pt=12345&mt=8
Android URL: https://play.google.com/store/apps/details?id=com.myapp&utm_source=instagram...

No file upload needed — redirect.html already handles this.
```

No upload. No website change. Just a new QR image for each campaign.

---

### Show campaign param formats

```bash
appqr params
```

---

## Use as a Node.js package

```javascript
import { setup, campaign } from 'appqr'

// First time setup
const result = await setup({
  ios: 'https://apps.apple.com/app/id123456789',
  android: 'https://play.google.com/store/apps/details?id=com.myapp',
  hostedUrl: 'https://myapp.com/go',
  iosParams: 'ct=launch&pt=12345&mt=8',
  androidParams: 'utm_source=launch&utm_campaign=v1&utm_medium=organic',
  outputPath: './public/go'
})
// → result.redirectPath  upload this once
// → result.qrPath        use this as your QR image

// Campaign QR — no upload needed
const qr = await campaign({
  ios: 'https://apps.apple.com/app/id123456789',
  android: 'https://play.google.com/store/apps/details?id=com.myapp',
  hostedUrl: 'https://myapp.com/go',
  iosParams: 'ct=instagram_launch&pt=12345&mt=8',
  androidParams: 'utm_source=instagram&utm_campaign=launch&utm_medium=paid',
  outputPath: './qrs/instagram'
})
// → qr.qrPath  your campaign QR image
```

Full TypeScript types included. No `@types/appqr` needed.

---

## MCP — For AI agents (Claude, Cursor, Copilot)

AppQR ships with a built-in MCP (Model Context Protocol) server. AI agents that support MCP can generate smart QR codes natively — no CLI knowledge, no manual steps.

### Add to Claude Desktop

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

### Add to Cursor

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

After connecting, the agent can:

> *"Generate a smart QR code for my app. App Store: apps.apple.com/app/id123. Play Store: play.google.com/store/apps/details?id=com.app. Host it at myapp.com/go."*

The agent calls `appqr_setup` or `appqr_campaign` directly and gets back the file paths.

### MCP tools exposed

| Tool | Description |
|------|-------------|
| `appqr_setup` | First time setup — generates redirect.html + qr.png |
| `appqr_campaign` | New campaign QR — generates qr.png only |
| `appqr_validate` | Validate store URLs before generating |

---

## Campaign parameter formats

### Apple App Store

| Param | What it is | Required | Example |
|-------|-----------|----------|---------|
| `ct` | Campaign token — your label | Recommended | `ct=instagram_launch` |
| `pt` | Provider token — your numeric Apple ID | Recommended | `pt=12345` |
| `mt` | Media type — always 8 for apps | Yes | `mt=8` |

```bash
--ios-params "ct=instagram_launch&pt=12345&mt=8"
```

### Google Play (standard UTM)

| Param | What it is | Required | Example |
|-------|-----------|----------|---------|
| `utm_source` | Traffic source | Yes | `utm_source=instagram` |
| `utm_medium` | Marketing medium | Yes | `utm_medium=paid` |
| `utm_campaign` | Campaign name | Yes | `utm_campaign=launch` |
| `utm_content` | Specific ad or creative | No | `utm_content=banner_v1` |
| `utm_term` | Keyword for search ads | No | `utm_term=todo+app` |

```bash
--android-params "utm_source=instagram&utm_campaign=launch&utm_medium=paid"
```

---

## Why not just use Bitly / QR Tiger / Branch?

| | Others | AppQR |
|---|---|---|
| Smart iOS/Android redirect | ✓ paid | ✓ free |
| Pricing | $15–40/month | free |
| Your QR works if they shut down | ✗ | ✓ always |
| Campaign tracking params | ✓ paid | ✓ free |
| Separate Apple & Google params | ✗ rarely | ✓ yes |
| Agent / CLI friendly | ✗ | ✓ yes |
| MCP server | ✗ | ✓ yes |
| Your campaign data on their server | ✓ always | ✗ never |

---

## Repository structure

```
appqr/
├── public/
│   ├── index.html        # Landing page
│   └── llms.txt          # AI agent discovery
├── api/
│   └── ping.js           # Telemetry (Vercel serverless)
├── cli/
│   ├── bin/appqr.js      # CLI entry point
│   ├── src/
│   │   ├── core.js       # Core logic
│   │   ├── mcp.mjs       # MCP server
│   │   ├── telemetry.js  # Anonymous counters
│   │   ├── index.js      # npm package exports
│   │   └── index.d.ts    # TypeScript types
│   └── package.json
├── vercel.json
└── README.md             # This file
```

---

## Deploy the web backend (Vercel + Supabase)

The web backend hosts the landing page and collects anonymous usage telemetry (install count, usage count, agent vs human split — no personal data).

### 1. Deploy to Vercel

```bash
git clone https://github.com/harishakumarn/appqr
cd appqr
vercel deploy
```

Or connect via the Vercel dashboard — import the repo, one click deploy.

### 2. Set up Supabase (optional — for telemetry)

Run this SQL in your Supabase project:

```sql
create table counters (
  id integer primary key default 1,
  installs bigint default 0,
  setups bigint default 0,
  human_runs bigint default 0,
  agent_runs bigint default 0,
  qrs_generated bigint default 0,
  constraint single_row check (id = 1)
);

insert into counters (id) values (1);

create or replace function increment_counter(col_name text)
returns void as $$
begin
  execute format(
    'update counters set %I = %I + 1 where id = 1',
    col_name, col_name
  );
end;
$$ language plpgsql;
```

Add to Vercel environment variables:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```

### 3. Update telemetry URL

In `cli/src/telemetry.js`, replace the `TELEMETRY_URL` with your Vercel deployment URL.

### 4. Publish to npm

```bash
cd cli
npm publish
```

---

## Privacy & telemetry

AppQR sends one anonymous ping per run. **No URLs, no campaign data, no store links, no personal information, no device identifiers are ever collected.**

The only thing tracked is a counter increment for one of:
`installed`, `setup`, `human_run`, `agent_run`, `qr_generated`

Opt out permanently:

```bash
echo 'export APPQR_NO_TELEMETRY=1' >> ~/.zshrc
```

Or per-run:

```bash
APPQR_NO_TELEMETRY=1 appqr setup ...
```

---

## Contributing

PRs welcome. The codebase is intentionally small — core logic is under 200 lines.

```bash
git clone https://github.com/harishakumarn/appqr
cd appqr/cli
npm install
node bin/appqr.js setup --help
```

---

## License

MIT © AppQR Contributors
