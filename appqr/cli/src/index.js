// src/index.js — npm package public API
// Use this when integrating AppQR into your own scripts or AI agents

const { setup, campaign, validateIosUrl, validateAndroidUrl } = require('./core');

module.exports = {
  /**
   * First time setup.
   * Generates redirect.html + first QR code.
   *
   * @param {Object} options
   * @param {string} options.ios          - App Store URL (must start with https://apps.apple.com)
   * @param {string} options.android      - Play Store URL (must start with https://play.google.com/store)
   * @param {string} options.hostedUrl    - URL where redirect.html will be hosted (e.g. https://myapp.com/go)
   * @param {string} [options.iosParams]  - Apple campaign params (e.g. "ct=campaign&pt=12345&mt=8")
   * @param {string} [options.androidParams] - Google UTM params (e.g. "utm_source=instagram&utm_campaign=launch")
   * @param {string} [options.outputPath] - Output directory (default: ./appqr-output)
   *
   * @returns {Promise<{ redirectPath: string, qrPath: string, qrUrl: string, iosUrl: string, androidUrl: string }>}
   *
   * @example
   * const { setup } = require('appqr')
   * const result = await setup({
   *   ios: 'https://apps.apple.com/app/id123',
   *   android: 'https://play.google.com/store/apps/details?id=com.myapp',
   *   hostedUrl: 'https://myapp.com/go',
   *   outputPath: './public/go'
   * })
   * // Upload result.redirectPath to your site at /go
   * // Use result.qrPath as your QR image
   */
  setup,

  /**
   * Generate a new campaign QR code.
   * No redirect.html generated — redirect.html is already on your site from setup.
   *
   * @param {Object} options
   * @param {string} options.ios             - App Store base URL
   * @param {string} options.android         - Play Store base URL
   * @param {string} options.hostedUrl       - URL where redirect.html is already hosted
   * @param {string} [options.iosParams]     - Apple campaign params (e.g. "ct=instagram&pt=12345&mt=8")
   * @param {string} [options.androidParams] - Google UTM params (e.g. "utm_source=instagram&utm_campaign=launch")
   * @param {string} [options.outputPath]    - Output directory (default: ./appqr-campaign)
   *
   * @returns {Promise<{ qrPath: string, qrUrl: string, iosUrl: string, androidUrl: string }>}
   *
   * @example
   * const { campaign } = require('appqr')
   * const result = await campaign({
   *   ios: 'https://apps.apple.com/app/id123',
   *   android: 'https://play.google.com/store/apps/details?id=com.myapp',
   *   hostedUrl: 'https://myapp.com/go',
   *   iosParams: 'ct=instagram_launch&pt=12345&mt=8',
   *   androidParams: 'utm_source=instagram&utm_campaign=launch&utm_medium=paid',
   *   outputPath: './qrs/instagram'
   * })
   * // Use result.qrPath for your Instagram campaign
   */
  campaign,

  // Utilities
  validateIosUrl,
  validateAndroidUrl
};
