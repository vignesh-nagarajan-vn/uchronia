# Changelog

All notable changes to Uchronia. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semver while 0.x reserves the right to rethink everything.

## [Unreleased]

### Added

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

- P2 discipline is measured from a branch's own divergence: late forks open as tightly as fresh roots.
- The critic calibrates its plausibility bar to the determinism dial.
- The state snapshot sent to prompts is budgeted by recency instead of growing without bound.
- The static HTML export embeds its typefaces (Spectral, IM Fell English, IBM Plex Mono) as data URIs; self-contained now includes the typography.
- The attractor block in pressure derivation scales with the dial instead of cliffing mid-band.
- Mock texture: wider keyword maps (aviation-age tech, more regions), six titles per mechanism, seeded sentence variants.

### Fixed

- Concurrent generation runs on one branch could duplicate ordinals; a per-branch lock (409) plus a unique `(branch_id, ordinal)` index closes it.
- Schema-valid imports with broken references persisted and then failed every read forever; imports now hydrate and machine-validate before touching the database (422).
- A crash mid-era left a half-persisted era that resume silently skipped; it is now rolled back and regenerated.
- A convergence-scan failure aborted the whole run after the era had committed; it now degrades to a warning.
- `max_tokens` truncation killed live runs; the provider retries once with a doubled budget.
- Fork left the parent's branch list stale in the delta view.
- Keyboard walking (`j`/`k`) painted a focus ring without moving focus; shortcuts fired underneath open dialogs.
- Opening a saved ledger downloaded the entire timeline export to find one branch id.
- One-shot LLM routes (POD intake, expand, retell, biography, artifacts, fork normalization) ignored the request's abort signal, so closing the tab kept billing the call in live mode; they now cancel with the request. Region adjacency ranking was case-sensitive against model-written region names. Freshly-introduced entities ranked as the quietest in the budgeted state snapshot instead of the most recent. The run's token usage, streamed on completion, is now actually shown in the ledger toolbar.

## [0.1.0] - 2026-07-22

Initial release: the full mock-mode product, keyless. POD intake, seed
consequences, the era loop with dual review (machine validator + skeptical
critic), determinism dial, convergence detection against a 203-anchor curated
baseline, lazy expansion (event detail, era deep-dives, biographies), four
diegetic artifact kinds, branching with structural sharing, branch/record
comparison, JSON import/export, markdown and self-contained HTML exports, and
the RED THREAD interface (Survey and Nitrate themes) with a Playwright-verified
keyless journey.
