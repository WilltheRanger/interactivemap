/**
 * Auto-fit each building group's trace to the illustration (chamfer matching).
 *
 * For every group in campus-upper.svg: rasterize ONLY that group (with the
 * current SVG_TO_IMAGE + ADJUST applied), take the outer boundary of the
 * filled mask, and search the translation (and scale, about the group's
 * center) that minimizes the truncated distance from boundary pixels to the
 * nearest edge pixel of the illustration. Prints the residual delta per
 * group in SVG units (what to ADD to GROUP_ADJUST).
 *
 *   node scripts/fit-map.mjs            → per-group residual fit (with current ADJUST)
 *   node scripts/fit-map.mjs global     → refit the global affine (ignores ADJUST)
 *
 * Dev-only; needs sharp (`npm i --no-save sharp`).
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = new URL('..', import.meta.url).pathname;
const IMAGE = { w: 1610, h: 977 };
// ── keep in sync with src/features/map/campusGeo.ts ──────────────────────────
const SVG_TO_IMAGE = { ax: 5.6, sx: 1.01, ay: 45.8, sy: 1.0225 };
const ADJUST = {
  'bldg600-upper': { dx: -3, dy: 0 },
};
// ─────────────────────────────────────────────────────────────────────────────

const svgText = readFileSync(`${ROOT}public/campus-upper.svg`, 'utf8');
const { w: W, h: H } = IMAGE;

// ── illustration edge map + truncated chamfer distance transform ────────────
const gray = (
  await sharp(`${ROOT}public/campus-map.webp`)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true })
).data;
const EDGE_T = 20;
const edge = new Uint8Array(W * H);
for (let y = 1; y < H - 1; y++)
  for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    const g = Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + W] - gray[i - W]);
    if (g > EDGE_T) edge[i] = 1;
  }
const CAP = 60; // chamfer units (×3 per px); truncate so occlusions (trees) don't dominate
const dt = new Uint16Array(W * H).fill(CAP);
for (let i = 0; i < W * H; i++) if (edge[i]) dt[i] = 0;
for (let y = 0; y < H; y++)
  for (let x = 0; x < W; x++) {
    const i = y * W + x;
    let v = dt[i];
    if (x > 0) v = Math.min(v, dt[i - 1] + 3);
    if (y > 0) v = Math.min(v, dt[i - W] + 3);
    if (x > 0 && y > 0) v = Math.min(v, dt[i - W - 1] + 4);
    if (x < W - 1 && y > 0) v = Math.min(v, dt[i - W + 1] + 4);
    dt[i] = Math.min(v, CAP);
  }
for (let y = H - 1; y >= 0; y--)
  for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x;
    let v = dt[i];
    if (x < W - 1) v = Math.min(v, dt[i + 1] + 3);
    if (y < H - 1) v = Math.min(v, dt[i + W] + 3);
    if (x < W - 1 && y < H - 1) v = Math.min(v, dt[i + W + 1] + 4);
    if (x > 0 && y < H - 1) v = Math.min(v, dt[i + W - 1] + 4);
    dt[i] = Math.min(v, CAP);
  }

// ── group boundary points (image space, current transform applied) ──────────
const USE_ADJUST = process.argv[2] !== 'global'; // global fit ignores per-group nudges

function groupSvg(gid) {
  const body = svgText.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const g = body.match(new RegExp(`<g id="${gid}">[\\s\\S]*?</g>`));
  const lone = body.match(new RegExp(`<(?:rect|path)[^>]*id="${gid}"[^>]*/?>`));
  const { dx, dy } = (USE_ADJUST ? ADJUST[gid] : null) ?? { dx: 0, dy: 0 };
  const { ax, sx, ay, sy } = SVG_TO_IMAGE;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
      `<g transform="translate(${ax},${ay}) scale(${sx},${sy}) translate(${dx},${dy})" fill="#000">` +
      (g ?? lone)[0].replaceAll('fill="#D9D9D9"', '').replaceAll(/opacity="[^"]*"/g, '') +
      `</g></svg>`,
  );
}

async function boundaryPoints(gid) {
  const { data } = await sharp(groupSvg(gid))
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pts = [];
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (
        data[i] > 128 &&
        (data[i - 1] <= 128 || data[i + 1] <= 128 || data[i - W] <= 128 || data[i + W] <= 128)
      )
        pts.push([x, y]);
    }
  return pts;
}

const score = (pts, dx, dy, s, cx, cy) => {
  let sum = 0;
  for (const [x, y] of pts) {
    const px = Math.round(cx + s * (x - cx) + dx);
    const py = Math.round(cy + s * (y - cy) + dy);
    sum += px >= 0 && px < W && py >= 0 && py < H ? dt[py * W + px] : CAP;
  }
  return sum / pts.length / 3; // ≈ mean px distance
};

function bestTranslate(pts, s, cx, cy, range = 24) {
  let best = { dx: 0, dy: 0, v: Infinity };
  for (let dy = -range; dy <= range; dy += 2)
    for (let dx = -range; dx <= range; dx += 2) {
      const v = score(pts, dx, dy, s, cx, cy);
      if (v < best.v) best = { dx, dy, v };
    }
  for (let dy = best.dy - 2; dy <= best.dy + 2; dy++)
    for (let dx = best.dx - 2; dx <= best.dx + 2; dx++) {
      const v = score(pts, dx, dy, s, cx, cy);
      if (v < best.v) best = { dx, dy, v };
    }
  return best;
}

const GIDS = [
  'bldg100',
  'bldg200-upper',
  'bldg300-upper',
  'bldg400-upper',
  'bldg500-upper',
  'bldg600-upper',
  'bldg800',
  'bldg900',
  'aquatics-center',
  '1031',
  'green-room',
];

// Anisotropic score: x' = fx·x + dx, y' = fy·y + dy (about the image origin).
const scoreXY = (pts, fx, fy, dx, dy) => {
  let sum = 0;
  for (const [x, y] of pts) {
    const px = Math.round(fx * x + dx);
    const py = Math.round(fy * y + dy);
    sum += px >= 0 && px < W && py >= 0 && py < H ? dt[py * W + px] : CAP;
  }
  return sum / pts.length / 3;
};

function bestTranslateXY(pts, fx, fy, range = 45) {
  let best = { dx: 0, dy: 0, v: Infinity };
  for (let dy = -range; dy <= range; dy += 3)
    for (let dx = -range; dx <= range; dx += 3) {
      const v = scoreXY(pts, fx, fy, dx, dy);
      if (v < best.v) best = { dx, dy, v };
    }
  for (let dy = best.dy - 3; dy <= best.dy + 3; dy++)
    for (let dx = best.dx - 3; dx <= best.dx + 3; dx++) {
      const v = scoreXY(pts, fx, fy, dx, dy);
      if (v < best.v) best = { dx, dy, v };
    }
  return best;
}

if (process.argv[2] === 'global') {
  // Fit one global affine using ALL groups' boundary points (no per-group nudges).
  const all = [];
  for (const gid of GIDS) {
    const pts = await boundaryPoints(gid);
    for (let i = 0; i < pts.length; i += 4) all.push(pts[i]);
  }
  console.log(`global fit over ${all.length} boundary points`);
  let best = { fx: 1, fy: 1, dx: 0, dy: 0, v: Infinity };
  for (let fx = 1.0; fx <= 1.1001; fx += 0.005)
    for (let fy = 1.0; fy <= 1.1001; fy += 0.005) {
      const t = bestTranslateXY(all, fx, fy);
      if (t.v < best.v) best = { fx: +fx.toFixed(3), fy: +fy.toFixed(3), ...t };
    }
  for (let fx = best.fx - 0.005; fx <= best.fx + 0.0051; fx += 0.0025)
    for (let fy = best.fy - 0.005; fy <= best.fy + 0.0051; fy += 0.0025) {
      const t = bestTranslateXY(all, fx, fy);
      if (t.v < best.v) best = { fx: +fx.toFixed(4), fy: +fy.toFixed(4), ...t };
    }
  const { ax, sx, ay, sy } = SVG_TO_IMAGE;
  // hypothesis: the trace is exactly 1:1 with the illustration
  const one = bestTranslateXY(all, 1 / sx, 1 / sy);
  console.log(
    `scale=1.0 exactly: ax=${(ax / sx + one.dx).toFixed(1)} ay=${(ay / sy + one.dy).toFixed(1)} → ${one.v.toFixed(2)}px`,
  );
  console.log('best refinement:', best);
  console.log('new SVG_TO_IMAGE = {');
  console.log(`  ax: ${(best.fx * ax + best.dx).toFixed(1)}, sx: ${(best.fx * sx).toFixed(4)},`);
  console.log(`  ay: ${(best.fy * ay + best.dy).toFixed(1)}, sy: ${(best.fy * sy).toFixed(4)},`);
  console.log('}');
} else {
  for (const gid of GIDS) {
    const pts = await boundaryPoints(gid);
    if (!pts.length) {
      console.log(gid, 'NO MASK');
      continue;
    }
    let cx = 0,
      cy = 0;
    for (const [x, y] of pts) {
      cx += x;
      cy += y;
    }
    cx /= pts.length;
    cy /= pts.length;
    const t1 = bestTranslate(pts, 1, cx, cy);
    let bestS = { s: 1, ...t1 };
    for (let s = 0.94; s <= 1.0601; s += 0.01) {
      const t = bestTranslate(pts, s, cx, cy);
      if (t.v < bestS.v) bestS = { s: Math.round(s * 1000) / 1000, ...t };
    }
    const { sx, sy } = SVG_TO_IMAGE;
    console.log(
      gid.padEnd(16),
      `now=${score(pts, 0, 0, 1, cx, cy).toFixed(2)}px`,
      `| translate: Δsvg=(${(t1.dx / sx).toFixed(1)},${(t1.dy / sy).toFixed(1)}) → ${t1.v.toFixed(2)}px`,
      `| +scale: s=${bestS.s} Δsvg=(${(bestS.dx / sx).toFixed(1)},${(bestS.dy / sy).toFixed(1)}) → ${bestS.v.toFixed(2)}px`,
    );
  }
}
