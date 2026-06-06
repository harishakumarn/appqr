// Type definitions for appqr
// Provides full autocomplete and type safety for AI agents and TypeScript projects

/**
 * Options for the setup() function — first time use.
 */
export interface SetupOptions {
  /**
   * Apple App Store URL for your app.
   * Must start with: https://apps.apple.com
   * @example "https://apps.apple.com/app/id123456789"
   */
  ios: string;

  /**
   * Google Play Store URL for your app.
   * Must start with: https://play.google.com/store
   * @example "https://play.google.com/store/apps/details?id=com.myapp"
   */
  android: string;

  /**
   * The full URL where you will host redirect.html on your own website.
   * The generated QR code will point to this URL.
   * @example "https://myapp.com/go"
   */
  hostedUrl: string;

  /**
   * Apple App Store campaign tracking parameters.
   * Format: URL query string without the leading ?
   * Parameters:
   *   ct  = campaign token (your label)       e.g. ct=instagram_launch
   *   pt  = provider token (your Apple ID)    e.g. pt=12345
   *   mt  = media type (always 8 for apps)    e.g. mt=8
   * @example "ct=instagram_launch&pt=12345&mt=8"
   */
  iosParams?: string;

  /**
   * Google Play Store UTM campaign tracking parameters.
   * Format: URL query string without the leading ?
   * Parameters:
   *   utm_source   = traffic source            e.g. utm_source=instagram
   *   utm_medium   = marketing medium          e.g. utm_medium=paid
   *   utm_campaign = campaign name             e.g. utm_campaign=launch
   *   utm_content  = specific ad or creative   e.g. utm_content=banner_v1 (optional)
   *   utm_term     = keyword for search ads    e.g. utm_term=todo+app (optional)
   * @example "utm_source=instagram&utm_campaign=launch&utm_medium=paid"
   */
  androidParams?: string;

  /**
   * Directory where output files will be written.
   * Will be created if it does not exist.
   * @default "./appqr-output"
   */
  outputPath?: string;
}

/**
 * Result returned by setup().
 */
export interface SetupResult {
  /** Absolute path to the generated redirect.html file. Upload this to your site at hostedUrl. */
  redirectPath: string;

  /** Absolute path to the generated QR code PNG image. */
  qrPath: string;

  /**
   * The full URL encoded into the QR code.
   * Format: {hostedUrl}?d={base64url-encoded-store-urls}
   * This is what the QR code points to.
   */
  qrUrl: string;

  /** The full iOS store URL including any campaign params. */
  iosUrl: string;

  /** The full Android store URL including any campaign params. */
  androidUrl: string;
}

/**
 * Options for the campaign() function — generates a new QR per campaign.
 * redirect.html must already be uploaded to hostedUrl from a previous setup() call.
 */
export interface CampaignOptions {
  /**
   * Apple App Store URL for your app.
   * Must start with: https://apps.apple.com
   * @example "https://apps.apple.com/app/id123456789"
   */
  ios: string;

  /**
   * Google Play Store URL for your app.
   * Must start with: https://play.google.com/store
   * @example "https://play.google.com/store/apps/details?id=com.myapp"
   */
  android: string;

  /**
   * The full URL where redirect.html is already hosted on your website.
   * Must match the hostedUrl used in the original setup() call.
   * @example "https://myapp.com/go"
   */
  hostedUrl: string;

  /**
   * Apple App Store campaign tracking parameters for this campaign.
   * @example "ct=instagram_launch&pt=12345&mt=8"
   */
  iosParams?: string;

  /**
   * Google Play Store UTM campaign tracking parameters for this campaign.
   * @example "utm_source=instagram&utm_campaign=launch&utm_medium=paid"
   */
  androidParams?: string;

  /**
   * Directory where the QR code PNG will be written.
   * Will be created if it does not exist.
   * @default "./appqr-campaign"
   */
  outputPath?: string;
}

/**
 * Result returned by campaign().
 */
export interface CampaignResult {
  /** Absolute path to the generated QR code PNG image. */
  qrPath: string;

  /**
   * The full URL encoded into the QR code.
   * Format: {hostedUrl}?d={base64url-encoded-store-urls}
   */
  qrUrl: string;

  /** The full iOS store URL including campaign params. */
  iosUrl: string;

  /** The full Android store URL including campaign params. */
  androidUrl: string;
}

/**
 * First time setup. Generates redirect.html and the first QR code.
 *
 * Upload the generated redirect.html to your website at hostedUrl.
 * You only need to do this once per app — all future campaigns just generate a new QR.
 *
 * @param options - Setup configuration
 * @returns Paths to generated files and the QR code URL
 * @throws {Error} If iOS URL does not start with https://apps.apple.com
 * @throws {Error} If Android URL does not start with https://play.google.com/store
 * @throws {Error} If hostedUrl is not a valid full URL
 *
 * @example
 * ```typescript
 * import { setup } from 'appqr'
 *
 * const result = await setup({
 *   ios: 'https://apps.apple.com/app/id123456789',
 *   android: 'https://play.google.com/store/apps/details?id=com.myapp',
 *   hostedUrl: 'https://myapp.com/go',
 *   iosParams: 'ct=launch&pt=12345&mt=8',
 *   androidParams: 'utm_source=launch&utm_campaign=v1&utm_medium=organic',
 *   outputPath: './public/go'
 * })
 *
 * // Upload result.redirectPath to your site at /go
 * // Use result.qrPath as the QR image on your landing page
 * console.log('Upload this file:', result.redirectPath)
 * console.log('Use this QR:', result.qrPath)
 * ```
 */
export function setup(options: SetupOptions): Promise<SetupResult>;

/**
 * Generate a new campaign QR code.
 * redirect.html must already be hosted at hostedUrl from a previous setup() call.
 * No file upload needed — just use the generated QR image.
 *
 * @param options - Campaign configuration
 * @returns Path to the generated QR code and the encoded URL
 * @throws {Error} If iOS URL does not start with https://apps.apple.com
 * @throws {Error} If Android URL does not start with https://play.google.com/store
 * @throws {Error} If hostedUrl is not a valid full URL
 *
 * @example
 * ```typescript
 * import { campaign } from 'appqr'
 *
 * const qr = await campaign({
 *   ios: 'https://apps.apple.com/app/id123456789',
 *   android: 'https://play.google.com/store/apps/details?id=com.myapp',
 *   hostedUrl: 'https://myapp.com/go',
 *   iosParams: 'ct=instagram_launch&pt=12345&mt=8',
 *   androidParams: 'utm_source=instagram&utm_campaign=launch&utm_medium=paid',
 *   outputPath: './qrs/instagram'
 * })
 *
 * console.log('Campaign QR ready:', qr.qrPath)
 * ```
 */
export function campaign(options: CampaignOptions): Promise<CampaignResult>;

/**
 * Validate an Apple App Store URL.
 * Returns true if the URL starts with https://apps.apple.com
 *
 * @example
 * validateIosUrl('https://apps.apple.com/app/id123') // true
 * validateIosUrl('https://example.com')              // false
 */
export function validateIosUrl(url: string): boolean;

/**
 * Validate a Google Play Store URL.
 * Returns true if the URL starts with https://play.google.com/store
 *
 * @example
 * validateAndroidUrl('https://play.google.com/store/apps/details?id=com.app') // true
 * validateAndroidUrl('https://example.com')                                    // false
 */
export function validateAndroidUrl(url: string): boolean;
