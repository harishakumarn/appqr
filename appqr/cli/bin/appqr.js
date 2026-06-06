#!/usr/bin/env node
// bin/appqr.js — CLI entry point

const { program } = require('commander');
const { setup, campaign } = require('../src/core');
const { ping, isAgentRun, isFirstRun } = require('../src/telemetry');
const path = require('path');

// ─── Param format hints ───────────────────────────────────────────────────────

const IOS_HINT = `
  Apple App Store campaign params:
    ct  = campaign token  e.g. ct=instagram_launch
    pt  = provider token  e.g. pt=12345   (your numeric Apple ID)
    mt  = media type      always mt=8 for apps

  Example: --ios-params "ct=instagram_launch&pt=12345&mt=8"
`;

const ANDROID_HINT = `
  Google Play campaign params (standard UTM):
    utm_source    e.g. utm_source=instagram
    utm_medium    e.g. utm_medium=paid
    utm_campaign  e.g. utm_campaign=launch
    utm_content   e.g. utm_content=banner_v1   (optional)

  Example: --android-params "utm_source=instagram&utm_campaign=launch&utm_medium=paid"
`;

// ─── Program ──────────────────────────────────────────────────────────────────

program
  .name('appqr')
  .description('Smart QR code generator for App Store and Google Play')
  .version('1.0.0');

// ─── Setup Command ────────────────────────────────────────────────────────────

program
  .command('setup')
  .description('First time setup — generates redirect.html and your first QR code')
  .requiredOption('--ios <url>', 'App Store URL (https://apps.apple.com/...)')
  .requiredOption('--android <url>', 'Play Store URL (https://play.google.com/store/...)')
  .requiredOption('--url <url>', 'URL where you will host redirect.html (e.g. https://myapp.com/go)')
  .option('--ios-params <params>', 'Apple campaign params (run "appqr params" for format)')
  .option('--android-params <params>', 'Google Play UTM params (run "appqr params" for format)')
  .option('--output <dir>', 'Output directory', './appqr-output')
  .action(async (opts) => {
    const agent = isAgentRun();
    if (isFirstRun()) ping('installed');
    ping(agent ? 'agent_run' : 'human_run');

    try {
      console.log('\n  AppQR — Setup\n');

      const result = await setup({
        ios: opts.ios,
        android: opts.android,
        hostedUrl: opts.url,
        iosParams: opts.iosParams,
        androidParams: opts.androidParams,
        outputPath: opts.output
      });

      ping('setup');
      ping('qr_generated');

      console.log(`  ✓ redirect.html  →  ${result.redirectPath}`);
      console.log(`  ✓ qr.png         →  ${result.qrPath}`);
      console.log('');
      console.log(`  → Upload redirect.html to your site at: ${opts.url}`);
      console.log(`  → QR points to: ${result.qrUrl.slice(0, 80)}...`);
      console.log('');
      console.log('  Done! For future campaigns, run: appqr campaign');
      console.log('');
    } catch (err) {
      console.error(`\n  ✗ Error: ${err.message}\n`);
      process.exit(1);
    }
  });

// ─── Campaign Command ─────────────────────────────────────────────────────────

program
  .command('campaign')
  .description('Generate a new campaign QR code — no file upload needed')
  .requiredOption('--ios <url>', 'App Store base URL')
  .requiredOption('--android <url>', 'Play Store base URL')
  .requiredOption('--url <url>', 'URL where redirect.html is already hosted')
  .option('--ios-params <params>', 'Apple campaign params (run "appqr params" for format)')
  .option('--android-params <params>', 'Google Play UTM params (run "appqr params" for format)')
  .option('--output <dir>', 'Output directory', './appqr-campaign')
  .action(async (opts) => {
    const agent = isAgentRun();
    ping(agent ? 'agent_run' : 'human_run');

    try {
      console.log('\n  AppQR — New Campaign QR\n');

      const result = await campaign({
        ios: opts.ios,
        android: opts.android,
        hostedUrl: opts.url,
        iosParams: opts.iosParams,
        androidParams: opts.androidParams,
        outputPath: opts.output
      });

      ping('qr_generated');

      console.log(`  ✓ qr.png  →  ${result.qrPath}`);
      console.log('');
      console.log(`  iOS URL:     ${result.iosUrl}`);
      console.log(`  Android URL: ${result.androidUrl}`);
      console.log('');
      console.log('  No file upload needed — redirect.html already handles this.');
      console.log('');
    } catch (err) {
      console.error(`\n  ✗ Error: ${err.message}\n`);
      process.exit(1);
    }
  });

// ─── Params Command ───────────────────────────────────────────────────────────

program
  .command('params')
  .description('Show campaign parameter formats for Apple and Google')
  .action(() => {
    console.log('\n  Campaign parameter formats:\n');
    console.log(IOS_HINT);
    console.log(ANDROID_HINT);
  });

// ─── MCP Command ──────────────────────────────────────────────────────────────

program
  .command('mcp')
  .description('Start the MCP server for AI agent integration (Claude, Cursor, Copilot)')
  .action(async () => {
    // MCP server is ESM — use dynamic import from this CJS entry point
    const mcpPath = new URL('../src/mcp.mjs', 'file://' + __dirname + '/').href;
    const { startMcpServer } = await import(mcpPath);
    await startMcpServer();
  });

// ─── Parse ────────────────────────────────────────────────────────────────────

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}
