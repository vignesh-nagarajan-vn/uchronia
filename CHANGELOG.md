# Changelog

All notable changes to Uchronia. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow semver while 0.x reserves the right to rethink everything.

## [Unreleased]

## [2.0.0] - 2026-07-30 - The Second Derivation

v2 exists because of one failure. A user typed *"What if the Allies lost World War 2"* and got a canned alternate history set in the **1600s**: no API key meant the server silently degraded to the demo engine, and the demo engine's year regex read "World War 2" as the year 2, found nothing, and rolled a random century. The north star: **the engine answers the question asked, provably.**

**The WW2 gate.** That prompt now produces, in demo mode, a POD snapped to 1940 in Europe behind an unmissable banner saying the content is canned, and a history that runs 1940 to 2024 on subject. `demo/the-allies-lose.uchronia.json` is that derivation, kept. The live half verifies on the deployment rather than this machine (ADR-0004).

### Added

- **M13, honest modes.** `mode: 'live' | 'demo'` on `/api/config`, an amber DEMO pill, a composer banner, and a third colour family (notice) that borrows neither record blue nor thread red. `POST /api/live-check` spends one output token and puts the verdict in the body. A dated per-model cost meter with cumulative `run.usage` frames. `pnpm check:secrets`, CI-enforced.
- **M14, POD Intake 2.0.** `pod-interpret` grounded on retrieved anchors returns a reading, a confidence, named ambiguities, and 1-4 real candidate mechanisms; the interpretation card lets the reader confirm or edit before anything is created. On-divergence mandates in the prompts, an on-divergence critic dimension, and `batchReachesPod` as the machine tripwire. The random-year fallback is dead.
- **M15, quality machinery.** `packages/evals` with a 31-POD benchmark, a keyless CI mock lane, a budget-capped live lane with a relevance judge, and critic A/B fixtures. The Engine Room: one persisted trace per provider call, with prompt, response, and per-call cost. Validator rules 10 and 11 plus a warning-grade geographic advisory. Fuzzing over intake and imports.
- **M16, Baseline 2.0.** The curated spine grows **203 to 1578 anchors**, 4000 BC to 2024, 54 centuries, 367 in the twentieth. Anchor schema v2 (regions, themes, magnitude, attractor strength) and a validating assembler that writes nothing if one anchor is malformed. A 72-anchor fact-check with adversarial refutation confirmed 8 corrections. The record room at `/record`; 85 gallery entries with intake hints.
- **M17, the Symposium and the Court.** Three specialist chairs draft each era and a fourth merges them, keeping what they could not settle as contested marginalia. The Court of Plausibility hears disputed events: advocate, skeptic, one ruling. Dial axes come off the master dial on demand.
- **M18, lives and deep time.** Birth years, counterfactual actors, succession, and role tenures replayed from the ledger. A divergence now runs to the present by default, with an optional epilogue marked as a projection. Convergence 2.0 names the attractor, the lateness, and the road. Claims: regional indices and name drift, with a philology lens and validator rule 12.
- **M19, branch algebra.** The counterfactual pulse forecasts a flip without committing to it. The graft transplants an event and its direct consequences onto another line. A cross-branch fate table, and a third column in compare.
- **M20, the literary surface.** Telegram, broadcast transcript, obituary, and classified page, each in the register its form imposes. Procedural heraldry obeying the tincture rule. In-world historiography: rival schools with real blind spots.
- **M21, the Book.** Commission a branch into a frontispiece, chapters, plates, and appendices, as print-grade HTML and as a hand-packaged EPUB 3.
- **M22, the map.** Region-control claims and a deliberately schematic map that says so, with a data table carrying the same claims. The command palette (Ctrl+K) from anywhere.
- **M23, interrogation.** Ask the Archivist, every factual sentence pinned to a row that resolves in-app, with "the record is silent" as a real answer. The Grand Inquiry: a verdict, a cited chain, required counter-considerations, and a confidence about the record rather than the prose.
- **M24, the spending gate.** ADR-0005 supersedes ADR-0003: a public deployment may hold a key, behind a passphrase, a per-IP rate limit, and a UTC-day token ledger. On serverless a key with no `UCHRONIA_ACCESS_TOKEN` is **refused** and the instance serves the demo. Prompt caching on the stable system prefix.
- **M25, showcases.** Three more chronicles beside the original, offered on a first visit and seeded on a fresh deployment.

### Changed

- Retrieval measures specificity from the corpus rather than from word length, so a long function word no longer outranks a short proper noun; it sharpens as the baseline grows.
- An ask that names its own event fixes its own year: retrieval suggests, the ask decides.
- The e2e server runs on an in-memory database, so every run starts on an empty shelf.
- `philology` is filterable but never a default lens.

### Known limitations

- **Live mode has never been exercised against the real API from this machine.** No key was ever placed in this tree (ADR-0004). Every live path is unit-tested against injected stubs and is one environment variable from running.
- **Build-time API spend for the entire v2 program: zero.**
- The rate limiter and daily ledger are in-memory and per instance: a brake on casual abuse, not a billing system. An account spend limit is what bounds the loss.
- Not built, and recorded as such in `docs/ROADMAP.md`: the Chronoscope play mode, the Atlas fork constellation, the Encyclopaedia Uchronica as its own route, SSE for the archivist, parallel expander fan-out, and run snapshots.

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
