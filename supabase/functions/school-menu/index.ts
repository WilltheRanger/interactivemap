/**
 * school-menu — proxies the My School Menus / Health-e Pro feed (menus.healthepro.com) for the web
 * app, the same way bell-schedule proxies the bell feed.
 *
 * Why: it's a public third-party API with no CORS headers, so a browser fetch from the Wayfinder site
 * is blocked. This runs server-side (Deno, on Supabase), fetches the month's per-day menu, parses the
 * JSON-string `setting` field, and returns a compact { date -> item names } map with permissive CORS.
 *
 * Request body (or query): { year, month, menuId? }  — defaults to the DBHS lunch menu.
 * Response: { menuId, year, month, days: { "YYYY-MM-DD": string[] }, fetchedAt }
 * Add ?debug=1 to get the raw upstream status/body instead (for diagnosing failures).
 *
 * Deployed with verify_jwt=false (public, read-only; the browser CORS preflight carries no auth).
 */

const BASE = 'https://menus.healthepro.com/api';
// DBHS lunch. These are per-school-year and may need updating: org 3101, site 15992, menu 118393.
const ORG = 3101;
const DEFAULT_MENU = 118393;

// The upstream rejects requests with no browser-like headers, so send the ones its site uses.
const UPSTREAM_HEADERS: Record<string, string> = {
  Accept: 'application/json',
  'User-Agent':
    'Mozilla/5.0 (compatible; DBHSWayfinder/1.0; +https://willtheranger.github.io/interactivemap/)',
};

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json', ...extra },
  });
}

interface DisplayItem {
  name?: string;
  weight?: number;
}

/** A standalone "&" / "and" is a "served with" separator in the source data, not a dish. */
function isSeparator(name: string): boolean {
  const n = name.trim().toLowerCase();
  return n === '' || n === '&' || n === '&amp;' || n === 'and';
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const url = new URL(req.url);
  let body: Record<string, unknown> = {};
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  const num = (key: string, fallback: number): number => {
    const raw = body[key] ?? url.searchParams.get(key);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const now = new Date();
  const year = num('year', now.getUTCFullYear());
  const month = num('month', now.getUTCMonth() + 1);
  const menuId = num('menuId', DEFAULT_MENU);
  const debug = url.searchParams.get('debug') != null || body.debug === true;

  const target = `${BASE}/organizations/${ORG}/menus/${menuId}/year/${year}/month/${month}/date_overwrites`;

  let res: Response;
  try {
    res = await fetch(target, { headers: UPSTREAM_HEADERS });
  } catch (err) {
    if (debug) return json({ debug: true, target, fetchError: String(err) });
    console.error('[school-menu] fetch failed', err);
    return json({ error: `Failed to reach the menu feed: ${String(err)}` }, 502);
  }

  if (debug) {
    const bodySnippet = (await res.text().catch(() => '')).slice(0, 600);
    return json({
      debug: true,
      target,
      status: res.status,
      statusText: res.statusText,
      ok: res.ok,
      contentType: res.headers.get('content-type'),
      bodySnippet,
    });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[school-menu] upstream not ok', res.status, detail.slice(0, 300));
    return json({ error: `Upstream menu ${res.status}` }, 502);
  }

  try {
    const payload = await res.json();
    const entries = Array.isArray(payload?.data) ? payload.data : [];

    const days: Record<string, string[]> = {};
    for (const entry of entries) {
      const day = typeof entry?.day === 'string' ? entry.day : null;
      if (!day) continue;
      let setting = entry.setting;
      if (typeof setting === 'string') {
        try {
          setting = JSON.parse(setting);
        } catch {
          setting = null;
        }
      }
      const display: DisplayItem[] = Array.isArray(setting?.current_display)
        ? setting.current_display
        : [];
      const names = display
        .slice()
        .sort((a, b) => (a.weight ?? 0) - (b.weight ?? 0))
        .map((d) => (typeof d.name === 'string' ? d.name.trim() : ''))
        .filter((name) => !isSeparator(name));
      if (names.length > 0) days[day] = names;
    }

    return json({ menuId, year, month, days, fetchedAt: new Date().toISOString() }, 200, {
      'cache-control': 'public, max-age=3600',
    });
  } catch (err) {
    console.error('[school-menu] parse failed', err);
    return json({ error: `Failed to parse the menu feed: ${String(err)}` }, 502);
  }
});
