/**
 * Per-level map calibration: fit one global affine mapping an SVG overlay's coords onto its
 * illustration, by chamfer-matching every traced shape boundary against the image's edges.
 *
 *   node scripts/fit-level.mjs lower   → prints SVG_TO_IMAGE for the lower level + writes a composite
 *
 * Only fitted-mode levels need this. Upper is now a combined SVG over a matching-frame illustration
 * (identity transform — see campusGeo.ts), so it isn't listed here.
 *
 * Dev-only; needs sharp (`npm i --no-save sharp`).
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = '/tmp/map-calib';
mkdirSync(OUT, { recursive: true });

const LEVELS = {
  lower: { svg: 'public/lower-combined.svg', img: 'public/campus-map-lower-v4.webp' },
};

const level = process.argv[2] ?? 'lower';
const { svg: SVG_PATH, img: IMG_PATH } = LEVELS[level];

const svgText = readFileSync(`${ROOT}${SVG_PATH}`, 'utf8');
const meta = await sharp(`${ROOT}${IMG_PATH}`).metadata();
const W = meta.width;
const H = meta.height;

// Strip per-shape paint so a wrapper <g> can repaint; keep geometry only.
const stripPaint = (s) => s.replace(/ (?:fill|stroke|stroke-width|opacity|clip-path)="[^"]*"/g, '');
const innerSvg = svgText
  .replace(/^<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/<defs>[\s\S]*?<\/defs>/g, '');

// ── illustration edge map + truncated chamfer distance transform ────────────
const gray = (
  await sharp(`${ROOT}${IMG_PATH}`).greyscale().raw().toBuffer({ resolveWithObject: true })
).data;
const edge = new Uint8Array(W * H);
for (let y = 1; y < H - 1; y++)
  for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + W] - gray[i - W]) > 20) edge[i] = 1;
  }
const CAP = 60;
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

// ── trace boundary points at scale 1 (identity), then search the affine ─────
const vb = (svgText.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${W} ${H}`).split(/\s+/).map(Number);
async function boundaryPoints() {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${vb[2]}" height="${vb[3]}" viewBox="${vb.join(' ')}">` +
      `<g fill="#000">${stripPaint(innerSvg)}</g></svg>`,
  );
  const { data } = await sharp(mask, { density: 96 })
    .resize(vb[2], vb[3])
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pts = [];
  for (let y = 1; y < vb[3] - 1; y++)
    for (let x = 1; x < vb[2] - 1; x++) {
      const i = y * vb[2] + x;
      if (
        data[i] > 128 &&
        (data[i - 1] <= 128 ||
          data[i + 1] <= 128 ||
          data[i - vb[2]] <= 128 ||
          data[i + vb[2]] <= 128)
      )
        pts.push([x, y]);
    }
  return pts;
}

const allPts = await boundaryPoints();
// Subsample: the coarse grid search only needs ~3k points to find the basin.
const pts = allPts.filter((_, i) => i % Math.max(1, Math.floor(allPts.length / 3000)) === 0);
const score = (fx, fy, dx, dy) => {
  let sum = 0;
  for (const [x, y] of pts) {
    const px = Math.round(fx * x + dx);
    const py = Math.round(fy * y + dy);
    sum += px >= 0 && px < W && py >= 0 && py < H ? dt[py * W + px] : CAP;
  }
  return sum / pts.length / 3;
};
const bestT = (fx, fy, range, step) => {
  let best = { dx: 0, dy: 0, v: Infinity };
  for (let dy = -range; dy <= range; dy += step)
    for (let dx = -range; dx <= range; dx += step) {
      const v = score(fx, fy, dx, dy);
      if (v < best.v) best = { dx, dy, v };
    }
  for (let dy = best.dy - step; dy <= best.dy + step; dy++)
    for (let dx = best.dx - step; dx <= best.dx + step; dx++) {
      const v = score(fx, fy, dx, dy);
      if (v < best.v) best = { dx, dy, v };
    }
  return best;
};

// Center the scale search on the image/viewBox size ratio (the export's downscale factor).
const rx = W / vb[2];
const ry = H / vb[3];
let best = { fx: rx, fy: ry, dx: 0, dy: 0, v: Infinity };
for (let fx = rx * 0.85; fx <= rx * 1.1501; fx += rx * 0.01)
  for (let fy = ry * 0.85; fy <= ry * 1.1501; fy += ry * 0.01) {
    const t = bestT(fx, fy, 60, 4);
    if (t.v < best.v) best = { fx: +fx.toFixed(4), fy: +fy.toFixed(4), ...t };
  }
for (let fx = best.fx - 0.005; fx <= best.fx + 0.00501; fx += 0.001)
  for (let fy = best.fy - 0.005; fy <= best.fy + 0.00501; fy += 0.001) {
    const t = bestT(fx, fy, 8, 1);
    if (t.v < best.v) best = { fx: +fx.toFixed(4), fy: +fy.toFixed(4), ...t };
  }

console.log(
  `${level}: image ${W}x${H}, ${pts.length} boundary pts, mean err ${best.v.toFixed(2)}px`,
);
console.log(`SVG_TO_IMAGE = { ax: ${best.dx}, sx: ${best.fx}, ay: ${best.dy}, sy: ${best.fy} }`);

// Composite for visual verification.
const { ax, sx, ay, sy } = { ax: best.dx, sx: best.fx, ay: best.dy, sy: best.fy };
const overlay = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<g transform="translate(${ax},${ay}) scale(${sx},${sy})" fill="rgba(124,58,237,0.25)" stroke="#E11D48" stroke-width="1">${stripPaint(innerSvg)}</g></svg>`,
);
await sharp(`${ROOT}${IMG_PATH}`)
  .composite([{ input: overlay }])
  .png()
  .toFile(`${OUT}/${level}.png`);
console.log(`wrote ${OUT}/${level}.png`);
