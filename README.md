# zam

Jam-style bug capture. A reporter records a screen, window, or tab from the browser extension; engineers get one link (`/r/<reportId>`) with the video plus the page's console and network activity from the recording window.

Videos are stored in the reporter's own Google Drive. Zam stores only report metadata and devtools evidence, never video bytes.

- **Capture:** Chrome/Firefox extension records video and collects console entries (calls, uncaught errors, rejections), fetch/XHR requests (method, redacted URL, status, duration, request/response headers and bodies — secrets redacted, bodies capped and text-only), user steps (clicks, navigations, tab visibility; never typed text), the reporter's browser/OS/viewport/connection, and the tab's application storage at stop (cookies, localStorage, sessionStorage; secrets redacted).
- **Share:** reports go `draft` → `published`; the unguessable report UUID in the link is the access capability.
- **Sign-in:** Google OAuth via Better Auth; Drive access is required to store the video.

Product context lives in [`PRODUCT.md`](PRODUCT.md); domain model and vocabulary in [`docs/architecture.md`](docs/architecture.md).

## Stack

TanStack Start (React) on Cloudflare Workers · oRPC · Drizzle + Neon Postgres · Better Auth · WXT extension · shadcn/ui + Tailwind · Alchemy (infra) · Varlock (env) · Vite+ · Oxlint/Oxfmt via Ultracite.

## Layout

```
apps/
  web/         Report viewer + auth (TanStack Start)
  extension/   Capture agent (WXT, Chrome + Firefox)
packages/
  capture/     Core domain: report model, devtools evidence, use cases
  api/         oRPC routers
  auth/        Better Auth config
  db/          Drizzle schema + migrations
  ui/          Shared shadcn/ui primitives and design tokens
  infra/       Alchemy stack (Cloudflare Worker + Neon)
  config/      Shared TS config
```

## Development

```bash
bun install
cd packages/infra && bunx alchemy profile edit   # once: pick Cloudflare + Neon profiles
bun run dev
```

- Web: <http://localhost:3010>. Alchemy provisions Neon and injects `DATABASE_URL`; no manual database setup.
- Extension: WXT dev server on port 5555. Requires `WXT_WEB_URL` (e.g. `http://localhost:3010`) in `apps/extension/.env`.
- Web env: fill `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` in an ignored env file next to `apps/web/.env.schema`.

### Environment

Each app owns its schema in `.env.schema`; Varlock generates `src/env.ts` on install. After editing a schema run `bun run env:generate`. Bun's automatic `.env` loading is disabled (`bunfig.toml`), so run Varlock-backed tools from the owning app's directory.

### Database

Generate and commit migration SQL after schema changes:

```bash
bun run db:generate
```

Deploys apply checked-in migrations. `db:push`, `db:migrate`, and `db:studio` are available for local work.

### UI

Tokens and global styles: `packages/ui/src/styles/globals.css` (shared by both apps). Add shared primitives from the repo root:

```bash
npx shadcn@latest add dialog -c packages/ui
```

```tsx
import { Button } from "@zam/ui/components/button";
```

Run the shadcn CLI from `apps/web` for app-specific blocks.

## Scripts

| Script                       | Does                                         |
| ---------------------------- | -------------------------------------------- |
| `bun run dev`                | All apps in dev mode                         |
| `bun run dev:web`            | Web only, without Alchemy                    |
| `bun run build`              | Build everything                             |
| `bun run check-types`        | Typecheck the workspace                      |
| `bun run check` / `fix`      | Ultracite lint + format check / autofix      |
| `bun run db:*`               | `generate`, `migrate`, `push`, `studio`      |
| `bun run deploy` / `destroy` | Alchemy stack for the current stage          |
| `bun run release`            | Version bump, changelog, tag, GitHub release |

Domain tests: `cd packages/capture && bun test`.

## Deployment

`bun run deploy` targets a personal `dev_<username>` stage. Production:

```bash
cd packages/infra && bunx alchemy deploy --stage production
```

### Release

Commits follow [Conventional Commits](https://www.conventionalcommits.org) (commitlint in the `commit-msg` hook and on PRs).

Release from GitHub: **Actions → Release → Run workflow** (bump: `auto` from commits, or `patch`/`minor`/`major`). It runs release-it in CI to bump the version (including `apps/extension/package.json`), update `CHANGELOG.md`, tag `vX.Y.Z`, and create the GitHub release, then calls:

- `.github/workflows/release-extension.yml`: builds Chrome and Firefox zips and attaches them to the release.
- `.github/workflows/deploy.yml`: deploys the `production` stage (also runnable on its own).

The `production` GitHub environment needs secrets `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `NEON_API_KEY`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and variable `WXT_WEB_URL` (production web URL).
