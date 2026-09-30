---
version: 1
slug: "src-pages-home-ui-home-page-tsx"
primary_target: "src/pages/home/ui/home-page.tsx"
related_targets: ["src/routes/index.tsx", "src/pages/home/ui/report-wall.tsx"]
---

## Scope

`/` home page. Mode: Persuade. Audience: QA/PM reporters and the engineers they file bugs to. Action: sign in and start capturing (Chrome Web Store URL not available yet; primary CTA routes to /login).

Motion (library: `motion`): focal moment = picking a report scrubs the sample recording's playhead 0 → first error (0.8s, ease-out-expo) while the clock counts up, then the toast pops and the matching error/failed rows flash citrus. First scrub waits until the panel is 50% in view. Title swaps with a short blur/rise. Wall drift is CSS and pauses on hover, focus, or when off screen. Reduced motion: no scrub or rise; title and row flashes stay as opacity/colour.

## Direction contract

THESIS: A bug report is one link carrying video, console and network. The page shows the wall of those links instead of a feature grid or a screenshot hero.

OWN-WORLD: Warm grey canvas #f0f0ee, white report cards 20px radius, near-black ink, citrus #ddec61 only on hover/active/selected and the primary CTA hover. Source Serif display, Inter UI, IBM Plex Mono for URLs, timings, status codes (IBM Plex Sans Thai for Thai glyphs only).

STORY: Visitor sees many real-shaped reports drift past, opens one, understands "one link, full context", signs in.

FIRST VIEWPORT: Display headline "One link. The whole bug." left (7/12, 90px serif), sub + black pill "Get started with Google" and outline "See a sample report" right (5/12), bottom-aligned. Beneath, full-bleed wall of four drifting columns of sample report cards (2 on mobile, 3 on tablet); one featured report panel floats centered over the wall (stacked below it under lg). Hover/focus/tap a card: it turns citrus and the panel swaps to that report (timeline, screen frame, console, network). "Sample data" label top-left of wall.

FORM: Report wall, rank 7 of 7, seed 8055040e.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
