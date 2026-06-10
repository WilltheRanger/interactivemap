/**
 * Offline calibration harness for the campus map overlay.
 *
 * Composites the traced plan SVG (campus-upper.svg) over the illustration
 * (campus-map.webp) using the same SVG_TO_IMAGE transform + GROUP_ADJUST
 * nudges the app applies, so alignment can be verified pixel-for-pixel
 * without running the app.
 *
 *   node scripts/calibrate-map.mjs            → /tmp/map-calib/full.png + per-building crops
 *
 * Edit ADJUST below (mirror of campusGeo.ts GROUP_ADJUST) while iterating,
 * then copy the final values back into campusGeo.ts. `scripts/fit-map.mjs`
 * computes the offsets automatically; this script is the visual check.
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

const IMAGE = { w: 1854, h: 1106 };
// ── keep in sync with src/features/map/campusGeo.ts ──────────────────────────
const SVG_TO_IMAGE = { ax: 11.3, sx: 1.1413, ay: 49.1, sy: 1.1401 };
const ADJUST = {
  'bldg600-upper': { dx: -3, dy: 0 },
};
// ─────────────────────────────────────────────────────────────────────────────

const svgText = readFileSync(`${ROOT}public/campus-upper.svg`, 'utf8');

/** Inner SVG content with per-group transforms applied + visible stroke styling. */
function styledSvgBody(onlyGroup) {
  let body = svgText.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  if (onlyGroup) {
    // Keep only the target group's shapes (group block, or standalone shape by id).
    const g = body.match(new RegExp(`<g id="${onlyGroup}">[\\s\\S]*?</g>`));
    const lone = body.match(new RegExp(`<(?:rect|path)[^>]*id="${onlyGroup}"[^>]*/?>`));
    body = `<g id="Upper">${(g ?? lone)[0]}</g>`;
  }
  // Strip per-shape paint so the wrapper <g>'s fill/stroke inherit (SVG presentation attrs).
  body = body.replace(/ (?:fill|stroke|stroke-width|opacity)="[^"]*"/g, '');
  for (const [gid, { dx, dy }] of Object.entries(ADJUST)) {
    body = body.replace(
      new RegExp(`(<(?:g|rect|path)[^>]*id="${gid}")`),
      `$1 transform="translate(${dx},${dy})"`,
    );
  }
  return body;
}

function overlaySvg(onlyGroup) {
  const { ax, sx, ay, sy } = SVG_TO_IMAGE;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${IMAGE.w}" height="${IMAGE.h}">` +
      `<g transform="translate(${ax},${ay}) scale(${sx},${sy})" fill="rgba(124,58,237,0.25)" stroke="#E11D48" stroke-width="1.5">${styledSvgBody(onlyGroup)}</g></svg>`,
  );
}

/** Image-space bbox per building group (parsed crudely from rect/path coords). */
function groupBoxes() {
  const boxes = {};
  const groupRe = /<g id="([^"]+)">([\s\S]*?)<\/g>/g;
  const upper = svgText.match(/<g id="Upper">([\s\S]*)<\/g>/)[1];
  const seen = new Set();
  for (const [, gid, bodyText] of upper.matchAll(groupRe)) {
    boxes[gid] = bodyBox(bodyText, ADJUST[gid]);
    for (const m of bodyText.matchAll(/id="([^"]+)"/g)) seen.add(m[1]);
  }
  // standalone shapes directly under Upper (aquatics-center, 1031, green-room…)
  for (const m of upper.matchAll(/<(rect|path)[^>]*id="([^"]+)"[^>]*\/?>(?:<\/path>)?/g)) {
    if (!seen.has(m[2])) boxes[m[2]] = bodyBox(m[0], ADJUST[m[2]]);
  }
  return boxes;
}

function bodyBox(text, adj = { dx: 0, dy: 0 }) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const r of text.matchAll(
    /<rect[^>]*x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g,
  )) {
    const [x, y, w, h] = [+r[1], +r[2], +r[3], +r[4]];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  for (const p of text.matchAll(/<path[^>]*d="([^"]+)"/g)) {
    for (const c of p[1].matchAll(/(-?[\d.]+)[\s,]+(-?[\d.]+)/g)) {
      minX = Math.min(minX, +c[1]);
      minY = Math.min(minY, +c[2]);
      maxX = Math.max(maxX, +c[1]);
      maxY = Math.max(maxY, +c[2]);
    }
  }
  const { ax, sx, ay, sy } = SVG_TO_IMAGE;
  return {
    x: ax + sx * (minX + adj.dx),
    y: ay + sy * (minY + adj.dy),
    w: sx * (maxX - minX),
    h: sy * (maxY - minY),
  };
}

await sharp(`${ROOT}public/campus-map.webp`)
  .resize(IMAGE.w, IMAGE.h) // normalize the asset to the coordinate space
  .composite([{ input: overlaySvg() }])
  .png()
  .toFile(`${OUT}/full.png`);

for (const [gid, b] of Object.entries(groupBoxes())) {
  const composite = await sharp(`${ROOT}public/campus-map.webp`)
    .resize(IMAGE.w, IMAGE.h)
    .composite([{ input: overlaySvg(gid) }])
    .png()
    .toBuffer();
  const pad = 40;
  const left = Math.max(0, Math.round(b.x - pad));
  const top = Math.max(0, Math.round(b.y - pad));
  const width = Math.min(IMAGE.w - left, Math.round(b.w + 2 * pad));
  const height = Math.min(IMAGE.h - top, Math.round(b.h + 2 * pad));
  await sharp(composite)
    .extract({ left, top, width, height })
    .resize({ width: width * 2, kernel: 'nearest' })
    .toFile(`${OUT}/${gid}.png`);
}
console.log('wrote', OUT);
