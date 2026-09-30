# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Reporters (primary):** QA testers and product managers who hit a bug in a web app and need to hand it to engineering without writing a long repro.
- **Engineers (consumers):** open the shared report link to see what happened and why, then fix it.

## Product Purpose

Zam is a Jam-style bug capture tool. A reporter records the screen, window, or tab once from the browser extension; engineers get a single link (`/r/<reportId>`) containing the video plus the page's console and network context from the recording window. Success: an engineer understands and reproduces the bug from the link alone, without a follow-up conversation.

## Positioning

The video lives in the reporter's own Google Drive; Zam stores only report metadata and devtools evidence, never video bytes.

## Operating Context

- Capture happens in the Chrome extension (`apps/extension`, WXT) on whatever site the reporter is testing.
- Reports are viewed in the web app (`apps/web`, TanStack Start) via a public share link; the unguessable report UUID is the capability.
- Sign-in is Google OAuth (Better Auth); Drive access is required to store the video.

## Capabilities and Constraints

- Report lifecycle: `draft` (video not yet stored) → `published` (video stored and link-shared).
- Devtools snapshot: console entries (calls, uncaught errors/rejections) and fetch/XHR requests (method, redacted URL, status, duration). URLs are redacted before storage.
- Title length is capped (`MAX_TITLE_LENGTH`, shared kernel `@zam/capture/domain`).
- Binding domain vocabulary lives in `docs/architecture.md`; UI copy uses the same terms (bug report, capture, reporter, share link).
- Shared UI primitives are shadcn/ui in `packages/ui`; both apps consume one token file (`packages/ui/src/styles/globals.css`).

## Brand Commitments

- Name: Zam.
- Visual reference (user-confirmed, binding): intentapp.dev's palette used literally: citrus `#ddec61` accent, warm greys (`#f0f0ee` canvas, `#e1dfde`, `#cfcdcb`), near-black `#080808`, moss secondaries (`#979a73`, `#717453`).
- Fonts (user-confirmed, binding): Inter for UI, a free serif stand-in for Intent's ABC Arizona Mix as display, **IBM Plex Mono** for mono, **IBM Plex Sans Thai** for Thai text only (fallback after the Latin face in every stack).
- System theme: light or dark follows the OS setting; no manual toggle.
- Logo: lowercase "zam" in Source Serif 4 plus a citrus full stop (the recording light / the bug moment). Masters in `apps/web/public/brand/` (`zam-logo.svg` ink, `zam-logo-light.svg` for dark grounds, `zam-mark.svg` tile). Favicons, app icons, `og.png` and extension icons are rendered from these.

## Evidence on Hand

None yet: no customers, testimonials, metrics, or pricing. Future work must not fabricate them.

## Product Principles

1. The link is the product: everything an engineer needs is one click away, nothing requires the reporter to explain again.
2. The reporter owns their video; Zam never holds video bytes.
3. Capture must be faster than writing the bug down.
4. Evidence over narration: console and network context outrank free-text description.
