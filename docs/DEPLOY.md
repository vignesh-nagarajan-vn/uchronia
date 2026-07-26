# Deploying Uchronia

Uchronia is local-first: a single-user app holding an API key. That shapes every deployment choice below.

## The recommendation, in one table

| Goal | How | Cost | Notes |
| --- | --- | --- | --- |
| Show someone a finished chronicle | **A static HTML export** | free | `GET /api/branches/:id/export.html` is a single self-contained file (typefaces embedded, no scripts). Attach it to a GitHub Release, send it as a file, or drop it on any static host you choose. Zero backend, zero risk. |
| Let people *play* with the product | **Vercel (one click)** or a **Docker container**, both in mock mode | ~free tier | Vercel: import the repo, zero configuration, ephemeral playground. Docker: durable history via a `/data` volume, on Fly.io / Railway / Render / a VPS. Both default keyless. |
| Generate real history with a key | **Run it locally** (`pnpm dev`, or the container with `-e UCHRONIA_MOCK=0 -e ANTHROPIC_API_KEY=…`) | your tokens | **Never expose a live-mode instance publicly.** The server has no authentication; every visitor would spend your key. `UCHRONIA_MAX_RUN_TOKENS` (default 3M/run) caps the blast radius of any single run, but it is a seatbelt, not a lock. |

## Vercel

This repo's own deployment lives at **<https://uchronia-server.vercel.app/>** - imported from GitHub exactly as described below, confirmed live 2026-07-26.

### How the build works

The repo carries a `vercel.json` that drives the whole deployment; the dashboard needs no build settings. The chain is deliberately boring:

1. **Install** - `npm install -g pnpm@11.16.0 && pnpm install --frozen-lockfile`. The pnpm version is pinned explicitly (no corepack, whose stale signing keys are a classic build-image failure); pnpm 11 requires Node ≥ 22.13, hence the repo-wide engine floor.
2. **Build** - `pnpm --filter @uchronia/server build:vercel` prebundles the entire Hono app (workspace TypeScript, the Zod schemas, the inlined showcase chronicle, the 52 KB baseline) into one plain ESM file, `apps/server/dist/vercel.js`, with only the native `better-sqlite3` left external; it also stages `dist/drizzle/` (migrations) and `dist/fonts/` (export typefaces) beside it. Then the web app builds and `scripts/mirror-dist.mjs` copies `apps/web/dist` to the root `dist/` Vercel serves.
3. **Function** - `api/index.mjs` is a two-line plain-JavaScript re-export of that bundle. Vercel's function builder never compiles TypeScript or resolves workspace packages; it traces one import plus `better-sqlite3`, and `includeFiles: "apps/server/dist/**"` carries the staged migrations and fonts. Rewrites send `/api/*` to the function and everything else to the SPA's `index.html`.

`pnpm verify:vercel` reproduces this locally: it builds the bundle, stages it exactly as Vercel ships it (the function file plus `apps/server/dist/**` and nothing else), imports it under plain Node with `VERCEL=1`, and drives the handler with real requests - cold-start migration, seeding, the native binding, a branch view, the font-embedded HTML export. CI runs it on ubuntu (the `vercel-shape` job), so the deployable shape cannot silently rot.

### Importing the repo

On [vercel.com/new](https://vercel.com/new): import the GitHub repository, leave **Root Directory** at the repository root, leave **Framework Preset** as **Other** and every build field untouched (`vercel.json` overrides them anyway), and set **Node.js Version** to **22.x** under Project Settings → General if it isn't already. No environment variables are required - Vercel's own `VERCEL=1` triggers every serverless default. Deploy.

### What serverless mode means here

Serverless has no durable disk, and the setup leans into it instead of pretending otherwise:

- The SQLite database lives at `/tmp/uchronia.db`, **per instance**. Histories survive while an instance stays warm, vanish when it recycles, are not shared between concurrent instances (a chronicle you just created may not be visible on the next request if it lands elsewhere), and **every redeploy resets the world** to the seeded chronicle. The web app says so honestly when a branch has evaporated. A playground, not an archive; export anything you want to keep.
- On cold start the showcase chronicle (inlined into the bundle) seeds an empty database (`UCHRONIA_SEED_DEMO`, default on under Vercel), so every visitor lands on 67 events of content rather than a blank atlas.
- Mock pacing defaults on (250 ms) so derivations visibly ink in; the SSE stream fits comfortably inside the function's 60 s `maxDuration`. If a stream is ever severed at the limit, the ledger says so honestly and everything accepted so far is saved - derive again to continue.
- Vercel caps request bodies around 4.5 MB, below the app's own 16 MB limit; very large JSON imports belong on a local instance.

All of this rides on plain env defaults triggered by `VERCEL=1` (see `apps/server/src/config.ts`) and stays overridable with the usual variables. Do not attach `ANTHROPIC_API_KEY` to a public Vercel deployment; the no-auth rule below applies with extra force when every cold start is a fresh anonymous playground - and live-mode generation can also outlast the 60 s window.

## The container

```sh
docker build -t uchronia .
docker run -p 8787:8787 -v uchronia-data:/data uchronia
# → http://localhost:8787  (web app + API, mock mode, demo pacing on)
```

The image builds the web app, then serves it from the API process via `UCHRONIA_STATIC_DIR` (SPA fallback included). Relevant environment:

| Var | Default | Meaning |
| --- | --- | --- |
| `UCHRONIA_MOCK` | `1` (set in image) | Deterministic keyless engine. Set `0` **and** provide `ANTHROPIC_API_KEY` for live mode (local only). |
| `UCHRONIA_HOST` | `0.0.0.0` (set in image) | The container must listen beyond loopback; outside containers the server defaults to `127.0.0.1`. |
| `UCHRONIA_DB` | `/data/uchronia.db` (set in image) | Mount a volume here or the history dies with the container. |
| `UCHRONIA_STATIC_DIR` | `/app/apps/web/dist` (set in image) | Unset to serve the API alone. |
| `UCHRONIA_MOCK_PACE_MS` | `250` (set in image) | Demo pacing so derivations visibly ink in. `0` for full speed. |
| `UCHRONIA_CORS_ORIGINS` | *(config default: empty)* | Comma-separated allowlist, only needed if the SPA is served from a different origin. |
| `UCHRONIA_MAX_RUN_TOKENS` | *(config default: 3000000)* | Hard per-run token ceiling in live mode. `0` disables. |

## Without Docker

`pnpm build` produces `apps/web/dist` (static) and `apps/server/dist/index.js` (esbuild bundle; keep `apps/server/drizzle/` next to it and `node_modules` available for `better-sqlite3` and the export fonts). Then:

```sh
UCHRONIA_STATIC_DIR=apps/web/dist node apps/server/dist/index.js
```

Or skip the bundle entirely and run `pnpm --filter @uchronia/server start` under a process manager; it is what the container does.

## What not to do

- Don't put a live-mode server behind a public URL "just for a demo"; that is what mock mode is for.
- Don't serve the SQLite file from a network filesystem; WAL mode wants a local disk.
- Don't strip the `/data` volume: the container treats history as durable state.
