---
version: 1
slug: "src-pages-editor-ui-editor-page-tsx"
primary_target: "src/pages/editor/ui/editor-page.tsx"
related_targets: ["src/features/edit-recording/ui/cut-timeline.tsx", "src/features/edit-recording/model/cut-ranges.ts"]
---

## Scope

Extension tab opened after Stop recording. Mode: Task. Audience: the reporter who just reproduced a bug. Action: trim what shouldn't be shared, name the bug, publish. Leaving is destructive (the recording only lives in the offscreen document), so every exit is explicit.

## Findings (before)

1. The timeline was a grey bar plus a slider preset to the whole recording: "Cut selection" on first click would cut everything (blocked only by the 1 s minimum), and nothing showed where the bug happened.
2. No playhead on the timeline; selection only by dragging thumbs; no keyboard path besides the slider.
3. Evidence loss was invisible: cutting the moment of the error silently dropped it from the report ("3 of 3 console entries" counted, never warned).
4. Discard had no confirmation and was styled like a disabled control; Publish read as secondary.
5. Title was the page title with no chance to name the bug before it became the share link's headline.
6. Single narrow column; status (cutting, uploading, Drive access) appeared below the fold, away from the button that caused it.

## Direction contract

THESIS: The editor is a pre-flight check for the share link: what the engineer will see, minus what the reporter chose to hide.

LAYOUT: Video and timeline left (fluid), a sticky right rail (22rem) with title, "In this report" counts, cut list, state, and the Publish / Discard pair. Stacks under lg with the rail after the timeline.

TIMELINE: Ruler with second ticks; evidence markers above the track (console errors and failed requests in destructive, clicks as ink ticks) so the reporter sees where the bug is before cutting; cut ranges hatched; the pending selection in citrus; a playhead that follows the video; clicking the track seeks. Selection starts empty and is created from the playhead (I / O) or by dragging on the track; the two-thumb slider appears for fine-tuning once a selection exists.

KEYBOARD: Space play/pause, ←/→ 1 s (Shift 5 s), I set start, O set end, X cut selection, Esc clear selection, ⌘Z restore last cut. Shortcuts ignore typing in inputs and are listed in the rail.

EVIDENCE GUARD: if the cuts remove console errors or failed requests, the rail says so in destructive text before publishing ("Your cuts remove 1 error and 1 failed request"), computed from the same `cutDevtools` result that is uploaded.

OWN-WORLD: same tokens as the web app (warm canvas, white cards 20px, Source Serif display title, Plex Mono for times and counts, citrus only for selection/active).

FINISH: Discard asks for confirmation; Publish is the single primary action; disabled controls stay legible.
