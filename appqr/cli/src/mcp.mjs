// src/mcp.mjs — AppQR MCP Server
// Exposes AppQR as a native tool for AI agents (Claude, Cursor, Copilot, etc.)
// that support the Model Context Protocol.
//
// Agents can call appqr_setup and appqr_campaign directly without knowing
// the CLI syntax or having AppQR installed globally.
//
// Start via: appqr mcp
// Or add to agent config: { "command": "npx", "args": ["appqr", "mcp"] }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { setup, campaign, validateIosUrl, validateAndroidUrl } = require('./core.js');
const { ping, isAgentRun } = require('./telemetry.js');

// ─── Server Definition ────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'appqr',
  version: '1.0.0',
  description: 'Smart QR code generator for App Store and Google Play. Generates a single QR code that detects the device and redirects iOS users to the App Store and Android users to Google Play. Supports separate campaign tracking parameters for Apple (ct, pt, mt) and Google (UTM params).'
});

// ─── Tool: appqr_setup ────────────────────────────────────────────────────────

server.tool(
  'appqr_setup',

  `First time setup for a new app. Generates two files:
  1. redirect.html — a generic file to upload once to the developer's website
  2. qr.png — the QR code image to use in marketing materials

  The redirect.html never needs to change — all future campaigns just generate new QR codes.
  Upload redirect.html to hostedUrl on the developer's website, then use qr.png everywhere.

  Apple campaign params format:
    ct = campaign token (your label)      e.g. ct=instagram_launch
    pt = provider token (numeric Apple ID) e.g. pt=12345
    mt = media type (always 8 for apps)   e.g. mt=8

  Google Play campaign params format (standard UTM):
    utm_source   = traffic source          e.g. utm_source=instagram
    utm_medium   = marketing medium        e.g. utm_medium=paid
    utm_campaign = campaign name           e.g. utm_campaign=launch
    utm_content  = specific ad/creative    e.g. utm_content=banner_v1 (optional)`,

  {
    ios: z
      .string()
      .describe('Apple App Store URL. Must start with https://apps.apple.com')
      .refine(validateIosUrl, { message: 'Must start with https://apps.apple.com' }),

    android: z
      .string()
      .describe('Google Play Store URL. Must start with https://play.google.com/store')
      .refine(validateAndroidUrl, { message: 'Must start with https://play.google.com/store' }),

    hostedUrl: z
      .string()
      .url()
      .describe('Full URL where redirect.html will be hosted on the developer\'s website. e.g. https://myapp.com/go'),

    iosParams: z
      .string()
      .optional()
      .describe('Apple App Store campaign params as a query string (without leading ?). e.g. "ct=launch&pt=12345&mt=8"'),

    androidParams: z
      .string()
      .optional()
      .describe('Google Play UTM params as a query string (without leading ?). e.g. "utm_source=instagram&utm_campaign=launch&utm_medium=paid"'),

    outputPath: z
      .string()
      .optional()
      .default('./appqr-output')
      .describe('Directory to write redirect.html and qr.png into. Created if it does not exist. Default: ./appqr-output')
  },

  async ({ ios, android, hostedUrl, iosParams, androidParams, outputPath }) => {
    ping('agent_run');

    try {
      const result = await setup({ ios, android, hostedUrl, iosParams, androidParams, outputPath });
      ping('setup');
      ping('qr_generated');

      return {
        content: [
          {
            type: 'text',
            text: [
              '✓ AppQR setup complete.',
              '',
              `redirect.html → ${result.redirectPath}`,
              `qr.png        → ${result.qrPath}`,
              '',
              `Upload redirect.html to your site at: ${hostedUrl}`,
              `QR code points to: ${result.qrUrl}`,
              '',
              'iOS URL:     ' + result.iosUrl,
              'Android URL: ' + result.androidUrl,
              '',
              'Next steps:',
              '  1. Upload redirect.html to your website at the hostedUrl path',
              '  2. Use qr.png in your marketing materials',
              '  3. For future campaigns, call appqr_campaign — no file upload needed'
            ].join('\n')
          }
        ]
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true
      };
    }
  }
);

// ─── Tool: appqr_campaign ─────────────────────────────────────────────────────

server.tool(
  'appqr_campaign',

  `Generate a new campaign QR code for an existing app setup.
  redirect.html must already be uploaded to hostedUrl from a previous appqr_setup call.
  This generates only a new qr.png — no file upload needed.

  Use this for every new marketing campaign — each gets its own QR code
  with campaign-specific tracking parameters for both Apple and Google.

  Apple campaign params format:
    ct = campaign token (your label)      e.g. ct=instagram_launch
    pt = provider token (numeric Apple ID) e.g. pt=12345
    mt = media type (always 8 for apps)   e.g. mt=8

  Google Play campaign params format (standard UTM):
    utm_source   = traffic source          e.g. utm_source=instagram
    utm_medium   = marketing medium        e.g. utm_medium=paid
    utm_campaign = campaign name           e.g. utm_campaign=launch
    utm_content  = specific ad/creative    e.g. utm_content=banner_v1 (optional)`,

  {
    ios: z
      .string()
      .describe('Apple App Store URL. Must start with https://apps.apple.com')
      .refine(validateIosUrl, { message: 'Must start with https://apps.apple.com' }),

    android: z
      .string()
      .describe('Google Play Store URL. Must start with https://play.google.com/store')
      .refine(validateAndroidUrl, { message: 'Must start with https://play.google.com/store' }),

    hostedUrl: z
      .string()
      .url()
      .describe('Full URL where redirect.html is already hosted. Must match the URL used in appqr_setup.'),

    iosParams: z
      .string()
      .optional()
      .describe('Apple App Store campaign params for this campaign. e.g. "ct=instagram_launch&pt=12345&mt=8"'),

    androidParams: z
      .string()
      .optional()
      .describe('Google Play UTM params for this campaign. e.g. "utm_source=instagram&utm_campaign=launch&utm_medium=paid"'),

    outputPath: z
      .string()
      .optional()
      .default('./appqr-campaign')
      .describe('Directory to write qr.png into. Created if it does not exist. Default: ./appqr-campaign')
  },

  async ({ ios, android, hostedUrl, iosParams, androidParams, outputPath }) => {
    ping('agent_run');

    try {
      const result = await campaign({ ios, android, hostedUrl, iosParams, androidParams, outputPath });
      ping('qr_generated');

      return {
        content: [
          {
            type: 'text',
            text: [
              '✓ Campaign QR generated.',
              '',
              `qr.png → ${result.qrPath}`,
              '',
              'iOS URL:     ' + result.iosUrl,
              'Android URL: ' + result.androidUrl,
              '',
              'No file upload needed — redirect.html already handles this campaign.'
            ].join('\n')
          }
        ]
      };
    } catch (err) {
      return {
        content: [{ type: 'text', text: `Error: ${err.message}` }],
        isError: true
      };
    }
  }
);

// ─── Tool: appqr_validate ─────────────────────────────────────────────────────

server.tool(
  'appqr_validate',

  'Validate App Store and/or Play Store URLs before generating a QR code. Use this to check URLs are correct before calling appqr_setup or appqr_campaign.',

  {
    ios: z
      .string()
      .optional()
      .describe('Apple App Store URL to validate'),

    android: z
      .string()
      .optional()
      .describe('Google Play Store URL to validate')
  },

  async ({ ios, android }) => {
    const results = [];

    if (ios !== undefined) {
      const valid = validateIosUrl(ios);
      results.push(`iOS URL: ${valid ? '✓ valid' : '✗ invalid — must start with https://apps.apple.com'}`);
    }

    if (android !== undefined) {
      const valid = validateAndroidUrl(android);
      results.push(`Android URL: ${valid ? '✓ valid' : '✗ invalid — must start with https://play.google.com/store'}`);
    }

    if (results.length === 0) {
      results.push('No URLs provided to validate.');
    }

    return {
      content: [{ type: 'text', text: results.join('\n') }]
    };
  }
);

// ─── Start Server ─────────────────────────────────────────────────────────────

export async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server runs until the agent disconnects — no explicit close needed
}

// Run if called directly
startMcpServer().catch((err) => {
  process.stderr.write(`AppQR MCP server error: ${err.message}\n`);
  process.exit(1);
});
