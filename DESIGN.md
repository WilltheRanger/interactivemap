# DESIGN.md — DBHS Wayfinder UI

**The mockup is the visual source of truth.** Match it exactly — colors, type, spacing,
component shapes. Do not improvise, substitute default styles, or add unrequested flourishes
(gradients, animations, extra pages). If a screen or state is not in the mockup, ASK — don't invent it.

## Design tokens — fill from the mockup
Pull exact values from the mockup. If it's a Figma file, read the variables/measurements directly
rather than eyeballing. Put these in code as CSS variables / a theme object and use ONLY these —
no random px values, no off-palette colors.

- **Colors:** background, surface, text, primary, accent, border, error → `<hex from mockup>`
- **Type:** heading font, body font, mono (if any); size + weight scale → `<from mockup>`
- **Spacing scale:** e.g. 4 / 8 / 12 / 16 / 24 / 32 → `<from mockup>`
- **Radius / shadow / density** → `<from mockup>`

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
