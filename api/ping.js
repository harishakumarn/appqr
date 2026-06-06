// api/ping.js — Telemetry endpoint
// Increments one of five counters in Supabase
// If env vars not set, gracefully returns 200 (no-op)

const VALID_EVENTS = ['installed', 'setup', 'human_run', 'agent_run', 'qr_generated'];

export default async function handler(req, res) {
  // Allow CORS for CLI calls
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { event } = req.body || {};

  // Validate event
  if (!event || !VALID_EVENTS.includes(event)) {
    return res.status(400).json({ error: 'Invalid event' });
  }

  // If Supabase not configured, silently succeed
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: true, note: 'telemetry not configured' });
  }

  try {
    // Map event name to column name
    const columnMap = {
      installed:    'installs',
      setup:        'setups',
      human_run:    'human_runs',
      agent_run:    'agent_runs',
      qr_generated: 'qrs_generated'
    };

    const column = columnMap[event];

    // Call Supabase REST API directly — no SDK needed
    // Uses a simple RPC to increment the counter atomically
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/increment_counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ col_name: column })
    });

    if (!response.ok) {
      // Log but don't fail — telemetry should never break the user's flow
      console.error('Supabase error:', await response.text());
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Silently succeed — telemetry failure should never surface to users
    console.error('Telemetry error:', err.message);
    return res.status(200).json({ ok: true });
  }
}
