# Deploying Uchronia

Uchronia is local-first: a single-user app holding an API key. That shapes every deployment choice below.

## The recommendation, in one table

| Goal | How | Cost | Notes |
| --- | --- | --- | --- |
| Show someone a finished chronicle | **A static HTML export** | free | `GET /api/branches/:id/export.html` is a single self-contained file (typefaces embedded, no scripts). Attach it to a GitHub Release, send it as a file, or drop it on any static host you choose. Zero backend, zero risk. |
| Let people *play* with the product | **Vercel (one click)** or a **Docker container**, both in mock mode | ~free tier | Vercel: import the repo, zero configuration, ephemeral playground. Docker: durable history via a `/data` volume, on Fly.io / Railway / Render / a VPS. Both default keyless. |
| Generate real history with a key | **Run it locally** (`pnpm dev`, or the container with `-e UCHRONIA_MOCK=0 -e ANTHROPIC_API_KEY=…`) | your tokens | **Never expose a live-mode instance publicly.** The server has no authentication; every visitor would spend your key. `UCHRONIA_MAX_RUN_TOKENS` (default 3M/run) caps the blast radius of any single run, but it is a seatbelt, not a lock. |

## Vercel

The repo carries a `vercel.json`, so "Import Project" on Vercel deploys with no dashboard settings: the web app builds statically (mirrored to a root-level `dist/` so any framework preset's default output expectation is satisfied), and the entire Hono API runs as one serverless function (`api/index.ts`, a catch-all behind `/api/*` rewrites; SSE streams within the function's 60s window). No environment variables are required; Vercel's own `VERCEL=1` triggers every serverless default. Keep the dashboard's Root Directory empty (the repository root); everything else may stay at its defaults.

Serverless has no durable disk, and the setup leans into it instead of pretending otherwise:

- The SQLite database lives at `/tmp/uchronia.db`, per warm instance. Histories survive while an instance stays warm and vanish when it recycles. A playground, not an archive; export anything you want to keep.
- On cold start the showcase chronicle seeds an empty database (`UCHRONIA_SEED_DEMO`, default on under Vercel), so every visitor lands on 67 events of content rather than a blank atlas.
- Mock pacing defaults on (250ms) so derivations visibly ink in.

All three behaviors are plain env defaults triggered by `VERCEL=1` (see `apps/server/src/config.ts`) and overridable with the usual variables. Do not attach `ANTHROPIC_API_KEY` to a public Vercel deployment; the no-auth rule below applies with extra force when every cold start is a fresh anonymous playground.

## The container

```sh
docker build -t uchronia .
docker run -p 8787:8787 -v uchronia-data:/data uchronia
# → http://localhost:8787  (web app + API, mock mode, demo pacing on)
```

The image builds the web app, then serves it from the API process via `UCHRONIA_STATIC_DIR` (SPA fallback included). Relevant environment:

| Var | Default in image | Meaning |
| --- | --- | --- |
| `UCHRONIA_MOCK` | `1` | Deterministic keyless engine. Set `0` **and** provide `ANTHROPIC_API_KEY` for live mode (local only). |
| `UCHRONIA_DB` | `/data/uchronia.db` | Mount a volume here or the history dies with the container. |
| `UCHRONIA_STATIC_DIR` | `/app/apps/web/dist` | Unset to serve the API alone. |
| `UCHRONIA_MOCK_PACE_MS` | `250` | Demo pacing so derivations visibly ink in. `0` for full speed. |
| `UCHRONIA_CORS_ORIGINS` | *(empty)* | Comma-separated allowlist, only needed if the SPA is served from a different origin. |
| `UCHRONIA_MAX_RUN_TOKENS` | `3000000` | Hard per-run token ceiling in live mode. `0` disables. |

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
