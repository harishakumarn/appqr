// src/telemetry.js — Anonymous usage telemetry
//
// Sends a single counter ping per event. No personal data. No URLs. No identifiers.
// Just increments one of five counters on a remote server.
// Opt out: set APPQR_NO_TELEMETRY=1 in your environment.

const TELEMETRY_URL = 'https://appqr-coral.vercel-app.vercel.app/api/ping';
// ↑ Replace with your actual Vercel deployment URL before publishing

const VALID_EVENTS = ['installed', 'setup', 'human_run', 'agent_run', 'qr_generated'];

// Detect whether the tool is being run by an agent/CI rather than a human
function isAgentRun() {
  return !!(
    process.env.CI ||
    process.env.CURSOR ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.JENKINS_URL ||
    process.env.TRAVIS ||
    !process.stdout.isTTY
  );
}

// Fire and forget — never throws, never blocks, never surfaces errors to user
async function ping(event) {
  // Opt-out check
  if (process.env.APPQR_NO_TELEMETRY) return;
  if (!VALID_EVENTS.includes(event)) return;

  try {
    // Use a short timeout so it never blocks the user's output
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    await fetch(TELEMETRY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event }),
      signal: controller.signal
    });

    clearTimeout(timeout);
  } catch {
    // Silently swallow all errors — telemetry must never affect the user
  }
}

// Called on first ever run — checks for a marker file
function isFirstRun() {
  const os = require('os');
  const path = require('path');
  const fs = require('fs');
  const markerPath = path.join(os.homedir(), '.appqr_installed');
  if (fs.existsSync(markerPath)) return false;
  try {
    fs.writeFileSync(markerPath, new Date().toISOString(), 'utf8');
  } catch {
    // Can't write marker — don't block
  }
  return true;
}

module.exports = { ping, isAgentRun, isFirstRun };
