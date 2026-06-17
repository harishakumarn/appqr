// src/core.js — Core logic for AppQR

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate an Apple App Store URL.
 * @param {string} url
 * @returns {boolean}
 */
function validateIosUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://apps.apple.com');
}

/**
 * Validate a Google Play Store URL.
 * @param {string} url
 * @returns {boolean}
 */
function validateAndroidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://play.google.com/store');
}

// ─── URL Building ─────────────────────────────────────────────────────────────

/**
 * Append campaign params to a store URL.
 * @param {string} baseUrl
 * @param {string} [params]
 * @returns {string}
 */
function buildStoreUrl(baseUrl, params) {
  if (!params || params.trim() === '') return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return baseUrl + separator + params.trim();
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

/**
 * Encode both store URLs into a base64url string for the QR code URL.
 * @param {string} iosUrl
 * @param {string} androidUrl
 * @returns {string}
 */
function encodeUrls(iosUrl, androidUrl) {
  const payload = JSON.stringify({ ios: iosUrl, android: androidUrl });
  return Buffer.from(payload).toString('base64url');
}

/**
 * Build the full QR code URL.
 * @param {string} hostedUrl
 * @param {string} iosUrl
 * @param {string} androidUrl
 * @returns {string}
 */
function buildQrUrl(hostedUrl, iosUrl, androidUrl) {
  const encoded = encodeUrls(iosUrl, androidUrl);
  const base = hostedUrl.endsWith('/') ? hostedUrl.slice(0, -1) : hostedUrl;
  return `${base}?d=${encoded}`;
}

// ─── redirect.html Template ───────────────────────────────────────────────────

/**
 * Generate the generic redirect HTML file.
 *
 * Mobile: detects iOS or Android and redirects immediately.
 * Desktop: shows a simple page with both store download badges.
 *
 * File is completely data-free — all URLs are decoded from the ?d= param at runtime.
 * Upload once to your website, never touch again.
 *
 * @returns {string}
 */
function generateRedirectHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Download the app</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #faf9f7;
      color: #1a1a18;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      text-align: center;
      max-width: 320px;
      width: 100%;
    }
    .title {
      font-size: 1.2rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: #1a1a18;
    }
    .sub {
      font-size: 0.875rem;
      color: #888;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .badges {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      align-items: center;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.75rem;
      background: #1a1a18;
      color: #fff;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      width: 200px;
      transition: opacity 0.2s;
    }
    .badge:hover { opacity: 0.8; }
    .badge svg { width: 22px; height: 22px; flex-shrink: 0; }
    .badge-text { text-align: left; }
    .badge-text small { display: block; font-size: 0.65rem; opacity: 0.7; line-height: 1; margin-bottom: 2px; }
    .badge-text span { font-size: 0.875rem; font-weight: 500; }
    .redirecting { font-size: 0.875rem; color: #888; }
    .error { color: #c0392b; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="card" id="card">
    <p class="redirecting">Redirecting...</p>
  </div>
  <script>
    (function () {
      try {
        var params = new URLSearchParams(window.location.search);
        var d = params.get('d');
        if (!d) throw new Error('No data');

        var json = atob(d.replace(/-/g, '+').replace(/_/g, '/'));
        var urls = JSON.parse(json);
        if (!urls.ios || !urls.android) throw new Error('Missing URLs');

        var ua = navigator.userAgent;
        var isAndroid = /android/i.test(ua);
        var isIos = /iphone|ipad|ipod/i.test(ua);

        if (isAndroid) {
          window.location.replace(urls.android);
        } else if (isIos) {
          window.location.replace(urls.ios);
        } else {
          // Desktop — show both store badges
          document.getElementById('card').innerHTML = [
            '<p class="title">Download the app</p>',
            '<p class="sub">Choose your platform below</p>',
            '<div class="badges">',

            // App Store badge
            '<a class="badge" href="' + urls.ios + '" target="_blank">',
            '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">',
            '<path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>',
            '</svg>',
            '<div class="badge-text"><small>Download on the</small><span>App Store</span></div>',
            '</a>',

            // Play Store badge
            '<a class="badge" href="' + urls.android + '" target="_blank">',
            '<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">',
            '<path d="M3.18 23.76c.3.17.64.22.99.14l12.82-7.41-2.82-2.82-10.99 10zm16.64-9.65L16.96 12l2.86-2.11-12.96-7.48c-.34-.2-.71-.24-1.04-.13L16.96 12l2.86 2.11zM.75 2.35A1.5 1.5 0 0 0 .5 3.1v17.8c0 .27.08.52.25.73L12 12 .75 2.35zm20.07 8.54L18.3 9.22l-1.34.98 1.34.98 2.52 1.83c.71.41.71 1.57 0 1.98l-.01.01-2.51 1.82-1.34.98 1.34.98 2.52-1.83c1.41-.82 1.41-2.99 0-3.81v.01z"/>',
            '</svg>',
            '<div class="badge-text"><small>Get it on</small><span>Google Play</span></div>',
            '</a>',

            '</div>'
          ].join('');
        }
      } catch (e) {
        document.getElementById('card').innerHTML =
          '<p class="error">Invalid QR code. Please scan again.</p>';
      }
    })();
  </script>
</body>
</html>
`;
}

// ─── QR Code Generation ───────────────────────────────────────────────────────

/**
 * Generate a QR code PNG image.
 * @param {string} url
 * @param {string} outputFilePath
 * @returns {Promise<void>}
 */
async function generateQrImage(url, outputFilePath) {
  await QRCode.toFile(outputFilePath, url, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    width: 512,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

// ─── Setup Mode ───────────────────────────────────────────────────────────────

/**
 * First time setup. Generates redirect.html and first QR code.
 *
 * @param {object} options
 * @param {string} options.ios
 * @param {string} options.android
 * @param {string} options.hostedUrl
 * @param {string} [options.iosParams]
 * @param {string} [options.androidParams]
 * @param {string} [options.outputPath]
 * @returns {Promise<{redirectPath, qrPath, qrUrl, iosUrl, androidUrl}>}
 */
async function setup({ ios, android, hostedUrl, iosParams, androidParams, outputPath = './appqr-output' }) {
  if (!validateIosUrl(ios)) throw new Error('Invalid App Store URL. Must start with: https://apps.apple.com');
  if (!validateAndroidUrl(android)) throw new Error('Invalid Play Store URL. Must start with: https://play.google.com/store');
  if (!hostedUrl || !hostedUrl.startsWith('http')) throw new Error('Invalid hosted URL. Must be a full URL like: https://myapp.com/go');

  const iosUrl = buildStoreUrl(ios, iosParams);
  const androidUrl = buildStoreUrl(android, androidParams);
  const outDir = path.resolve(outputPath);
  fs.mkdirSync(outDir, { recursive: true });

  const redirectPath = path.join(outDir, 'redirect.html');
  fs.writeFileSync(redirectPath, generateRedirectHtml(), 'utf8');

  const qrUrl = buildQrUrl(hostedUrl, iosUrl, androidUrl);
  const qrPath = path.join(outDir, 'qr.png');
  await generateQrImage(qrUrl, qrPath);

  return { redirectPath, qrPath, qrUrl, iosUrl, androidUrl };
}

// ─── Campaign Mode ────────────────────────────────────────────────────────────

/**
 * Generate a new campaign QR code only — no redirect.html needed.
 *
 * @param {object} options
 * @param {string} options.ios
 * @param {string} options.android
 * @param {string} options.hostedUrl
 * @param {string} [options.iosParams]
 * @param {string} [options.androidParams]
 * @param {string} [options.outputPath]
 * @returns {Promise<{qrPath, qrUrl, iosUrl, androidUrl}>}
 */
async function campaign({ ios, android, hostedUrl, iosParams, androidParams, outputPath = './appqr-campaign' }) {
  if (!validateIosUrl(ios)) throw new Error('Invalid App Store URL. Must start with: https://apps.apple.com');
  if (!validateAndroidUrl(android)) throw new Error('Invalid Play Store URL. Must start with: https://play.google.com/store');
  if (!hostedUrl || !hostedUrl.startsWith('http')) throw new Error('Invalid hosted URL. Must be a full URL like: https://myapp.com/go');

  const iosUrl = buildStoreUrl(ios, iosParams);
  const androidUrl = buildStoreUrl(android, androidParams);
  const outDir = path.resolve(outputPath);
  fs.mkdirSync(outDir, { recursive: true });

  const qrUrl = buildQrUrl(hostedUrl, iosUrl, androidUrl);
  const qrPath = path.join(outDir, 'qr.png');
  await generateQrImage(qrUrl, qrPath);

  return { qrPath, qrUrl, iosUrl, androidUrl };
}

module.exports = {
  setup,
  campaign,
  validateIosUrl,
  validateAndroidUrl,
  generateRedirectHtml,
  buildStoreUrl,
  encodeUrls,
  buildQrUrl
};
