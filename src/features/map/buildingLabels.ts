/**
 * Friendly labels for the building groups (the `<g id>`s) in public/upper-combined.svg, plus the two
 * standalone shapes (aquatics, music). Used by the map detail card. These ids come from the owner's
 * Figma export; the room numbers inside each group are the real DBHS numbers.
 */
export const BUILDING_LABELS: Record<string, string> = {
  bldg100: '100s — Admin',
  'bldg200-upper': '200s Building',
  'bldg300-upper': '300s Building',
  'bldg400-upper': '400s — Library',
  'bldg500-upper': '500s Building',
  'bldg600-upper': '600s Building',
  bldg800: '800s — Gym & PE',
  bldg900: '900s — Theater & Arts',
  // The 2026-06-10 re-export renamed the standalone shapes to human-readable ids.
  'Aquatics center': 'Aquatics Center',
  'Green Room': 'Green Room',
  '1031': 'Instrumental Music',
};
