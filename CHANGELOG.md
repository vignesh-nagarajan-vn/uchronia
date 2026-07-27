# Changelog

All notable changes to Uchronia. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semver while 0.x reserves the right to rethink everything.

## [Unreleased]

## [1.0.0] - 2026-07-26

The first stable release: the 0.2 hardening series plus the deployment-hardening pass, live at <https://uchronia-server.vercel.app/>.

### Added

- A fake-Vercel smoke harness (`pnpm verify:vercel` / `scripts/verify-vercel.mjs`): stages the serverless function exactly as Vercel ships it and drives it with real requests - cold-start migrations, bundled-ledger seeding, the native sqlite binding, the font-embedded HTML export. CI runs it on ubuntu (`vercel-shape` job).
- `UCHRONIA_HOST`: the server now binds `127.0.0.1` by default (making SECURITY.md's localhost posture literally true); the container image sets `0.0.0.0`.
- The server entry loads a repo-root `.env` (real environment always wins), making the README's `cp .env.example .env` flow actually work.
- Server config tests: empty env vars mean "unset" (an empty `UCHRONIA_MAX_RUN_TOKENS=` no longer silently disables the token ceiling, an empty `UCHRONIA_SEED_DEMO=` no longer disables Vercel seeding), the serverless `/tmp` redirect, and the host default.

- Entity lifecycle: terminal deltas (`ends: true`) end people and institutions for good; a ninth machine-validator rule (`no-posthumous-mutation`) makes the dead unarguable, branch-locally.
- The causal graph now feeds generation: recent events carry their parents into prompts, the critic receives cited causes resolved to titles, and pressures must carry or discharge the previous era's springs.
- Region-aware convergence: anchors rank by the POD's theatre before year proximity.
- Lifecycle API: `PATCH /api/timelines/:id` (rename, dial, horizon extension), `POST .../events/:id/regenerate` (a fresh telling in place), `DELETE /api/branches/:id` (burn leaf branches).
- Per-run token accounting with a hard ceiling (`UCHRONIA_MAX_RUN_TOKENS`), abort signals that reach the provider's HTTP layer, and a Stop button in the ledger.
- Web: route-level code-splitting, ledger search (`/`), multi-lens filtering, prev/next event walking, copy-link, rename and themed burn dialogs, one-click showcase-chronicle loading, error boundary and 404 page, SSE live-region announcements.
- Deployment: single-container Dockerfile (mock-mode public demo safe by default), `UCHRONIA_STATIC_DIR` static serving with SPA fallback, and zero-config Vercel support (`vercel.json` + a catch-all `api/index.ts` function, `/tmp` SQLite, showcase seeding via `UCHRONIA_SEED_DEMO`).
- Mock demo pacing (`UCHRONIA_MOCK_PACE_MS`) so the ink-in moment is visible keyless.
- Brand assets: the Uchronia seal on the Atlas and the README masthead, and a favicon set from the split-hourglass mark (`apps/web/public/`).
- A human voice for the chronicle: every reader-facing prompt embeds a humanity mandate (chronicler's hand, banned stock phrasing, no em dashes), and the prose register tracks the dial, fraying at butterfly settings and steadying at railroad. An output scrubber guarantees no em dash survives into any store; mock content follows the same house style.

### Changed

- The Vercel function is now prebundled: `build:vercel` compiles the whole server (workspace TS, schemas, the showcase chronicle, the baseline) into one plain ESM file that `api/index.mjs` re-exports, with migrations and export fonts staged beside it under `apps/server/dist/` - Vercel's builder no longer compiles TypeScript or resolves workspace packages at all. The install command pins pnpm via `npm install -g` instead of corepack. The handler is a hand-rolled `(req, res)` bridge: the runtime both invokes Node-style (a fetch-shaped `hono/vercel` handler hangs to a 504) and pre-consumes request bodies for its helpers (a stream-reading adapter hangs every POST), so the entry builds the web Request itself, rebuilding bodies from the helper buffer, and streams the Response out. The `verify:vercel` harness exercises the function through a real `node:http` server in both body regimes so a wrong-shaped handler fails locally.
- Default generation model is `claude-sonnet-5` (its predecessor `claude-sonnet-4-6` does not support the structured outputs the provider sends on every call, so live mode would have 400'd on the first request).
- Node floor raised to 22.13 (`.nvmrc`, `engines`) - pnpm 11.16 itself refuses to run below it.
- The web ledger reads the baseline through the typed API client, downloads exports without navigating away, keeps its theme guess from crashing sandboxed embeds, and shows a real error state on `/settings` when configuration fetch fails.
- P2 discipline is measured from a branch's own divergence: late forks open as tightly as fresh roots.
- The critic calibrates its plausibility bar to the determinism dial.
- The state snapshot sent to prompts is budgeted by recency instead of growing without bound.
- The static HTML export embeds its typefaces (Spectral, IM Fell English, IBM Plex Mono) as data URIs; self-contained now includes the typography.
- The attractor block in pressure derivation scales with the dial instead of cliffing mid-band.
- Mock texture: wider keyword maps (aviation-age tech, more regions), six titles per mechanism, seeded sentence variants.

### Fixed

- The esbuild server bundles crashed on load with a duplicate `createRequire` declaration (the banner collided with the bundle's own hoisted import) - caught by the new fake-Vercel harness; both bundles now alias the banner import.
- An SSE stream severed mid-run (network drop, serverless time limit) was presented as a completed derivation; the ledger now reports it honestly and everything accepted so far stays saved. SSE parsing also tolerates CRLF-normalizing proxies, joins multi-line data fields per spec, closes the HTTP body when a consumer stops early, and the server marks the stream `X-Accel-Buffering: no`.
- The em-dash scrubber could empty an all-dash field *after* schema validation, storing invalid content; a scrub that would empty a string now keeps the original.
- A store-guard violation during batch trial-apply escaped as an exception and killed the run instead of becoming a reviewable issue; two drafts could also collide on one renamed entity slug within a batch.
- Malformed JSON request bodies returned 500 `internal`; they now map to 400 `invalid-json`. Comparing against a nonexistent branch said "different timelines" (400) instead of 404.
- The `fork-normalized` validator rule ran twice per branch validation; era-drop errors mislabeled the era title as a template id; the critic's revision pass now bounds its provider fan-out.
- Concurrent generation runs on one branch could duplicate ordinals; a per-branch lock (409) plus a unique `(branch_id, ordinal)` index closes it.
- Schema-valid imports with broken references persisted and then failed every read forever; imports now hydrate and machine-validate before touching the database (422).
- A crash mid-era left a half-persisted era that resume silently skipped; it is now rolled back and regenerated.
- A convergence-scan failure aborted the whole run after the era had committed; it now degrades to a warning.
- `max_tokens` truncation killed live runs; the provider retries once with a doubled budget.
- Fork left the parent's branch list stale in the delta view.
- Keyboard walking (`j`/`k`) painted a focus ring without moving focus; shortcuts fired underneath open dialogs.
- Opening a saved ledger downloaded the entire timeline export to find one branch id.
- One-shot LLM routes (POD intake, expand, retell, biography, artifacts, fork normalization) ignored the request's abort signal, so closing the tab kept billing the call in live mode; they now cancel with the request. Region adjacency ranking was case-sensitive against model-written region names. Freshly-introduced entities ranked as the quietest in the budgeted state snapshot instead of the most recent. The run's token usage, streamed on completion, is now actually shown in the ledger toolbar.

### Removed

- The GitHub Pages showcase pipeline (deployment posture settled in ADR-0003: static exports + the mock playground carry the public face; live mode stays local).

## [0.1.0] - 2026-07-22

Initial release: the full mock-mode product, keyless. POD intake, seed
consequences, the era loop with dual review (machine validator + skeptical
critic), determinism dial, convergence detection against a 203-anchor curated
baseline, lazy expansion (event detail, era deep-dives, biographies), four
diegetic artifact kinds, branching with structural sharing, branch/record
comparison, JSON import/export, markdown and self-contained HTML exports, and
the RED THREAD interface (Survey and Nitrate themes) with a Playwright-verified
keyless journey.

[Unreleased]: https://github.com/vignesh-nagarajan-vn/uchronia/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/vignesh-nagarajan-vn/uchronia/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/vignesh-nagarajan-vn/uchronia/releases/tag/v0.1.0
