/**
 * bell-schedule — proxies the DBHS "Brahma Bells" feed (mrwai.com) for the web app.
 *
 * Why this exists: the feed only ever served a native app, so it sends no CORS headers and a browser
 * fetch from the Wayfinder web app would be blocked. This function runs server-side (Deno, on
 * Supabase), fetches the feed, and returns it with permissive CORS. It forwards the settings the
 * student picked (pathwaysAcademy / rallyScheduleB, plus the period toggles) as the query params the
 * upstream expects, so the correct daily variant comes back.
 *
 * Response: { todayKey: string, schedules: Schedule[], fetchedAt: string }
 *   - todayKey  = upstream /schedule/ (plain text: "Regular", "LateStart", …; "" when no school)
 *   - schedules = upstream /_schedule.json (every variant)
 *
 * Deployed with verify_jwt=false: this is a public, read-only proxy of public bell-times (no secrets,
 * no writes), and the browser's CORS preflight carries no auth — so JWT verification must be off.
 *   supabase functions deploy bell-schedule --no-verify-jwt
 */

const UPSTREAM = 'https://mrwai.com/dbhsbells';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const BOOL_KEYS = ['pathwaysAcademy', 'rallyScheduleB', 'period0', 'period1a', 'period6a'] as const;

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json', ...extra },
  });
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // Settings arrive in the POST body (supabase.functions.invoke) or as query params.
  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  const flag = (key: string): string => {
    const raw = body[key] ?? url.searchParams.get(key);
    return String(raw === true || raw === 'true');
  };

  // The day's variant depends on these two upstream params; the rest tune notifications (unused here).
  const scheduleQuery = new URLSearchParams({
    pathwaysAcademy: flag('pathwaysAcademy'),
    rallyScheduleB: flag('rallyScheduleB'),
  }).toString();

  try {
    const [matrixRes, todayRes] = await Promise.all([
      fetch(`${UPSTREAM}/_schedule.json`),
      fetch(`${UPSTREAM}/schedule/?${scheduleQuery}`),
    ]);

    if (!matrixRes.ok) {
      return json({ error: `Upstream schedule list ${matrixRes.status}` }, 502);
    }
    const schedules = await matrixRes.json();
    if (!Array.isArray(schedules)) {
      return json({ error: 'Upstream schedule list was not an array' }, 502);
    }
    const todayKey = todayRes.ok ? (await todayRes.text()).trim() : '';

    // Echo unused toggles back so the client can see what it asked for (handy when debugging).
    const echo = Object.fromEntries(BOOL_KEYS.map((k) => [k, flag(k) === 'true']));

    return json(
      { todayKey, schedules, settings: echo, fetchedAt: new Date().toISOString() },
      200,
      // Cache briefly at the edge: the day's variant is stable, the countdown is computed client-side.
      { 'cache-control': 'public, max-age=60' },
    );
  } catch (err) {
    return json({ error: `Failed to reach the bell-schedule feed: ${String(err)}` }, 502);
  }
});
