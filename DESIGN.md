# DESIGN.md — DBHS Wayfinder UI

**The mockup is the visual source of truth.** Match it exactly — colors, type, spacing,
component shapes. Do not improvise, substitute default styles, or add unrequested flourishes
(gradients, animations, extra pages). If a screen or state is not in the mockup, ASK — don't invent it.

## Design tokens — from the mockup
Source: the owner's **Diamond Bar Map screen** mockup (raster image; values read from it, not Figma
variables — nudge any hex if exact values exist). Canonical copy lives in `src/styles/tokens.css`;
components reference ONLY these — no random px/hex.

- **Colors:** bg `#eaebef` · surface `#ffffff` · text `#1f2433` · text-muted `#6b7280` ·
  primary (purple) `#582c83` · accent (gold) `#f4b41a` · border `#e7e3f1` · error `#c0392b`.
- **Type:** **Poppins** (rounded geometric sans — best read of the mockup), system fallback. Weights
  400/500/600/700. Sizes: nav labels 11px (uppercase, tracked) · body 16px · brand title 20px bold.
- **Spacing scale:** 4 / 8 / 12 / 16 / 20 / 24 / 32.
- **Radius:** 8 / 12 / 16 / 20 / pill. **Shadow:** soft card shadow (`--shadow-1/2`). **Density:** roomy, card-based.

> ⚠️ **Contrast note:** the mockup's gold CTA ("View 360°") uses **white** text on gold, which is
> below WCAG AA. Implemented as-shown to match the mockup; flag for the owner — a darker gold or dark
> purple text on gold would meet AA.

## UI rules — non-negotiable (this is "best practices," made checkable)
- **Mobile-first.** Used on a phone in a hallway. Design and test at ~375px wide first. Touch targets ≥ 44px.
- **Accessibility:** WCAG AA contrast minimum; visible keyboard focus states; semantic HTML; labels on every control and alt text on images; fully keyboard-navigable.
- **Every async action has three states — loading, empty, error:**
  - panorama loading (Theta images are large — show a loader, never a blank screen)
  - lookup miss (locker number not in any range; teacher/room not found)
  - empty / first-run (no schedule entered yet → a clear prompt, not a blank screen)
- **Consistent components:** build a small set of primitives (button, select, card, map pin, panorama hotspot) and reuse them. Don't restyle per screen.
- **Performance:** lazy-load panoramas, compress images, avoid layout shift while they load.
- **No scope-y UI additions** (settings pages, theming, extra screens) unless asked.

## Screens & states to cover
- Schedule entry — empty and filled
- 2D map — default, building selected, your-classes highlighted, now/next active
- Locker — number entry → section highlighted on map → 360° view with the pin; cover loading, found, and not-found

## For Claude Code
Build to the mockup **plus** these rules. Match the mockup before adding anything. When the mockup
is silent on a state, ask rather than invent. Keep tokens centralized (CSS variables / theme), sourced from above.
