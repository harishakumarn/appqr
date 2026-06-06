// src/core.js — Core logic for AppQR
// Handles validation, redirect.html generation, and QR code output

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate an Apple App Store URL.
 * @param {string} url - URL to validate
 * @returns {boolean} true if valid App Store URL
 * @example
 * validateIosUrl('https://apps.apple.com/app/id123') // true
 * validateIosUrl('https://example.com')              // false
 */
function validateIosUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://apps.apple.com');
}

/**
 * Validate a Google Play Store URL.
 * @param {string} url - URL to validate
 * @returns {boolean} true if valid Play Store URL
 * @example
 * validateAndroidUrl('https://play.google.com/store/apps/details?id=com.app') // true
 * validateAndroidUrl('https://example.com')                                    // false
 */
function validateAndroidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('https://play.google.com/store');
}

// ─── URL Building ─────────────────────────────────────────────────────────────

/**
 * Append campaign params to a store URL.
 * Handles whether the base URL already contains a query string.
 * @param {string} baseUrl - The store URL without campaign params
 * @param {string} [params] - Query string params without leading ? e.g. "utm_source=instagram"
 * @returns {string} Full URL with params appended
 */
function buildStoreUrl(baseUrl, params) {
  if (!params || params.trim() === '') return baseUrl;
  const separator = baseUrl.includes('?') ? '&' : '?';
  return baseUrl + separator + params.trim();
}

// ─── Encoding ─────────────────────────────────────────────────────────────────

/**
 * Encode both store URLs into a base64url string for embedding in the QR code URL.
 * Uses base64url (URL-safe) encoding — no +, /, or = characters that would need escaping.
 * The redirect.html decodes this client-side using atob() — no server involvement.
 * @param {string} iosUrl - Full iOS store URL including any campaign params
 * @param {string} androidUrl - Full Android store URL including any campaign params
 * @returns {string} base64url-encoded JSON payload
 */
function encodeUrls(iosUrl, androidUrl) {
  const payload = JSON.stringify({ ios: iosUrl, android: androidUrl });
  return Buffer.from(payload).toString('base64url');
}

/**
 * Build the full QR code URL by combining the hosted redirect URL with encoded store URLs.
 * @param {string} hostedUrl - Where redirect.html lives e.g. https://myapp.com/go
 * @param {string} iosUrl - Full iOS store URL
 * @param {string} androidUrl - Full Android store URL
 * @returns {string} Complete URL to embed in the QR code
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
 * This file is intentionally data-free — it contains no campaign data, no store URLs,
 * no tracking parameters. All campaign data is encoded in the QR code URL itself (?d=...).
 *
 * The file:
 * 1. Reads the ?d= parameter from the URL
 * 2. Decodes it from base64url to JSON
 * 3. Detects the device OS via navigator.userAgent
 * 4. Redirects to the correct store URL
 *
 * Because it contains no data, it never needs to be updated after the initial upload.
 * All new campaigns just generate new QR codes — the file stays the same forever.
 *
 * @returns {string} Complete HTML string ready to write to disk
 */
function generateRedirectHtml() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Redirecting...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #0a0a0a;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <p>Redirecting...</p>
  <script>
    (function () {
      try {
        var params = new URLSearchParams(window.location.search);
        var d = params.get('d');
        if (!d) throw new Error('No data');

        // base64url → base64 → JSON
        var json = atob(d.replace(/-/g, '+').replace(/_/g, '/'));
        var urls = JSON.parse(json);

        var ua = navigator.userAgent;
        var target = /android/i.test(ua) ? urls.android : urls.ios;

        if (!target) throw new Error('No URL');
        window.location.replace(target);
      } catch (e) {
        document.querySelector('p').textContent = 'Invalid QR code. Please scan again.';
      }
    })();
  </script>
</body>
</html>
`;
}

// ─── QR Code Generation ───────────────────────────────────────────────────────

/**
 * Generate a QR code PNG image from a URL.
 * @param {string} url - The URL to encode in the QR code
 * @param {string} outputFilePath - Absolute or relative path for the PNG output
 * @returns {Promise<void>}
 */
async function generateQrImage(url, outputFilePath) {
  await QRCode.toFile(outputFilePath, url, {
    errorCorrectionLevel: 'M', // Medium — good balance of density and fault tolerance
    type: 'png',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });
}

// ─── Setup Mode ───────────────────────────────────────────────────────────────

/**
 * First time setup. Generates redirect.html and the first QR code.
 *
 * Run this once per app. Upload the generated redirect.html to your website
 * at hostedUrl. You never need to upload or modify it again — all future
 * campaigns just generate new QR codes via campaign().
 *
 * @param {object} options
 * @param {string} options.ios - App Store URL (must start with https://apps.apple.com)
 * @param {string} options.android - Play Store URL (must start with https://play.google.com/store)
 * @param {string} options.hostedUrl - URL where redirect.html will be hosted e.g. https://myapp.com/go
 * @param {string} [options.iosParams] - Apple campaign params e.g. "ct=launch&pt=12345&mt=8"
 * @param {string} [options.androidParams] - Google UTM params e.g. "utm_source=instagram&utm_campaign=launch"
 * @param {string} [options.outputPath="./appqr-output"] - Directory to write files into
 *
 * @returns {Promise<{
 *   redirectPath: string,
 *   qrPath: string,
 *   qrUrl: string,
 *   iosUrl: string,
 *   androidUrl: string
 * }>}
 *
 * @throws {Error} If ios URL does not start with https://apps.apple.com
 * @throws {Error} If android URL does not start with https://play.google.com/store
 * @throws {Error} If hostedUrl is not a valid full URL
 *
 * @example
 * const result = await setup({
 *   ios: 'https://apps.apple.com/app/id123456789',
 *   android: 'https://play.google.com/store/apps/details?id=com.myapp',
 *   hostedUrl: 'https://myapp.com/go',
 *   iosParams: 'ct=launch&pt=12345&mt=8',
 *   androidParams: 'utm_source=launch&utm_campaign=v1&utm_medium=organic',
 *   outputPath: './public/go'
 * })
 * // Upload result.redirectPath to your site at /go — once, forever
 * // Use result.qrPath as your QR image
 */
async function setup({ ios, android, hostedUrl, iosParams, androidParams, outputPath = './appqr-output' }) {
  if (!validateIosUrl(ios)) {
    throw new Error(`Invalid App Store URL. Must start with: https://apps.apple.com`);
  }
  if (!validateAndroidUrl(android)) {
    throw new Error(`Invalid Play Store URL. Must start with: https://play.google.com/store`);
  }
  if (!hostedUrl || !hostedUrl.startsWith('http')) {
    throw new Error(`Invalid hosted URL. Must be a full URL like: https://myapp.com/go`);
  }

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
 * Generate a new campaign QR code.
 *
 * redirect.html must already be uploaded to hostedUrl from a previous setup() call.
 * This generates only a new QR code image — no file upload needed.
 * Run this once per campaign with campaign-specific tracking parameters.
 *
 * @param {object} options
 * @param {string} options.ios - App Store URL (must start with https://apps.apple.com)
 * @param {string} options.android - Play Store URL (must start with https://play.google.com/store)
 * @param {string} options.hostedUrl - URL where redirect.html is already hosted
 * @param {string} [options.iosParams] - Apple campaign params e.g. "ct=instagram_launch&pt=12345&mt=8"
 * @param {string} [options.androidParams] - Google UTM params e.g. "utm_source=instagram&utm_campaign=launch&utm_medium=paid"
 * @param {string} [options.outputPath="./appqr-campaign"] - Directory to write the QR image into
 *
 * @returns {Promise<{
 *   qrPath: string,
 *   qrUrl: string,
 *   iosUrl: string,
 *   androidUrl: string
 * }>}
 *
 * @throws {Error} If ios URL does not start with https://apps.apple.com
 * @throws {Error} If android URL does not start with https://play.google.com/store
 * @throws {Error} If hostedUrl is not a valid full URL
 *
 * @example
 * const qr = await campaign({
 *   ios: 'https://apps.apple.com/app/id123456789',
 *   android: 'https://play.google.com/store/apps/details?id=com.myapp',
 *   hostedUrl: 'https://myapp.com/go',
 *   iosParams: 'ct=instagram_launch&pt=12345&mt=8',
 *   androidParams: 'utm_source=instagram&utm_campaign=launch&utm_medium=paid',
 *   outputPath: './qrs/instagram'
 * })
 * // Use qr.qrPath as your campaign QR image — no upload needed
 */
async function campaign({ ios, android, hostedUrl, iosParams, androidParams, outputPath = './appqr-campaign' }) {
  if (!validateIosUrl(ios)) {
    throw new Error(`Invalid App Store URL. Must start with: https://apps.apple.com`);
  }
  if (!validateAndroidUrl(android)) {
    throw new Error(`Invalid Play Store URL. Must start with: https://play.google.com/store`);
  }
  if (!hostedUrl || !hostedUrl.startsWith('http')) {
    throw new Error(`Invalid hosted URL. Must be a full URL like: https://myapp.com/go`);
  }

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
