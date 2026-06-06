# AppQR CLI

Smart QR code generator for App Store and Google Play. Free, open source, no subscriptions.

---

## Install

```bash
npm install -g appqr
```

Or use without installing:

```bash
npx appqr setup ...
```

---

## How it works

1. **Run setup once** → get `redirect.html` + first QR code
2. **Upload `redirect.html`** to your existing website (e.g. `myapp.com/go/redirect.html`)
3. **Run campaigns forever** → just new QR codes, no file uploads needed

The `redirect.html` is a tiny generic file — it contains no campaign data.  
All campaign data is encoded into the QR URL itself. Your server just returns the file.

---

## Usage

### First time — setup

```bash
appqr setup \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go"
```

With campaign params on first QR:

```bash
appqr setup \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go" \
  --ios-params "ct=launch&pt=12345&mt=8" \
  --android-params "utm_source=launch&utm_campaign=v1&utm_medium=organic" \
  --output ./appqr-output
```

Output:
```
✓ redirect.html  →  ./appqr-output/redirect.html
✓ qr.png         →  ./appqr-output/qr.png

→ Upload redirect.html to your site at: https://myapp.com/go
→ QR points to: https://myapp.com/go?d=eyJhbmRy...
```

Upload `redirect.html` to your site. Done. Never touch it again.

---

### Every campaign after — just a new QR

```bash
appqr campaign \
  --ios "https://apps.apple.com/app/id123456789" \
  --android "https://play.google.com/store/apps/details?id=com.myapp" \
  --url "https://myapp.com/go" \
  --ios-params "ct=instagram_launch&pt=12345&mt=8" \
  --android-params "utm_source=instagram&utm_campaign=launch&utm_medium=paid" \
  --output ./qrs/instagram
```

Output:
```
✓ qr.png  →  ./qrs/instagram/qr.png

iOS URL:     https://apps.apple.com/app/id123456789?ct=instagram_launch&pt=12345&mt=8
Android URL: https://play.google.com/store/apps/details?id=com.myapp&utm_source=instagram...

No file upload needed — redirect.html already handles this.
```

---

### Show campaign param formats

```bash
appqr params
```

---

## Campaign parameter formats

### Apple App Store

| Param | What it is | Example |
|-------|-----------|---------|
| `ct`  | Campaign token — your label | `ct=instagram_launch` |
| `pt`  | Provider token — your numeric Apple ID | `pt=12345` |
| `mt`  | Media type — always 8 for apps | `mt=8` |

Example: `--ios-params "ct=instagram_launch&pt=12345&mt=8"`

### Google Play

| Param | What it is | Example |
|-------|-----------|---------|
| `utm_source` | Traffic source | `utm_source=instagram` |
| `utm_medium` | Marketing medium | `utm_medium=paid` |
| `utm_campaign` | Campaign name | `utm_campaign=launch` |
| `utm_content` | Specific ad/creative (optional) | `utm_content=banner_v1` |
| `utm_term` | Keyword if search (optional) | `utm_term=todo+app` |

Example: `--android-params "utm_source=instagram&utm_campaign=launch&utm_medium=paid"`

---

## Use as a Node.js package (for AI agents and scripts)

```javascript
const { setup, campaign } = require('appqr')

// First time setup
const result = await setup({
  ios: 'https://apps.apple.com/app/id123456789',
  android: 'https://play.google.com/store/apps/details?id=com.myapp',
  hostedUrl: 'https://myapp.com/go',
  iosParams: 'ct=launch&pt=12345&mt=8',
  androidParams: 'utm_source=launch&utm_campaign=v1',
  outputPath: './public/go'
})
// result.redirectPath — upload this to your site
// result.qrPath       — your QR image

// Campaign QR (no file upload needed)
const qr = await campaign({
  ios: 'https://apps.apple.com/app/id123456789',
  android: 'https://play.google.com/store/apps/details?id=com.myapp',
  hostedUrl: 'https://myapp.com/go',
  iosParams: 'ct=instagram_launch&pt=12345&mt=8',
  androidParams: 'utm_source=instagram&utm_campaign=launch&utm_medium=paid',
  outputPath: './qrs/instagram'
})
// qr.qrPath — your campaign QR image
```

---

## Privacy & telemetry

AppQR sends one anonymous ping per run. Only a counter is incremented — no URLs, no campaign data, no personal information, no identifiers.

Opt out at any time:

```bash
export APPQR_NO_TELEMETRY=1
```

Or permanently in your shell profile:

```bash
echo 'export APPQR_NO_TELEMETRY=1' >> ~/.zshrc
```

---

## License

MIT
