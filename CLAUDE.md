# CLAUDE.md: agent onboarding contract

This file is the single source of truth for any agent session in this repository. A fresh agent reading only this file must be able to work productively. **Last verified: 2026-07-30 (v2.0.0, M13-M25 complete).**

## 1. What Uchronia is

**Uchronia** (yoo-KROH-nee-uh; 1876, the temporal counterpart of *utopia*, a time that never was) is an alternate-history engine: *git rebase for history*. The user picks or writes a **Point of Divergence (POD)** and watches history re-derive itself era by era, drills into events, reads in-world biographies and fake primary sources, forks sub-branches, and compares everything against the real record.

It is not a listicle generator. It is a lightweight causal simulation wearing a literary interface: generation is grounded in explicit, mutable world-state; every claim is auditable through a causal graph; a machine validator plus a skeptical LLM critic police consistency; prose is the surface, the graph is the truth.

The build is driven by a master prompt (mirrored expectations live throughout `docs/`); milestones M0–M12 are tracked honestly in [docs/ROADMAP.md](docs/ROADMAP.md). Engine principles P1–P6 (state-grounded generation, ripple propagation, determinism dial + convergence, dual review, lazy generation, anti-cliché mandates) are summarized in [README.md](README.md) and specified in [docs/GENERATION.md](docs/GENERATION.md).

## 2. Vocabulary

| Term | Meaning |
| --- | --- |
| **POD** | Point of Divergence: the moment history splits (e.g. "Constantinople holds, 1453") |
| **branch** | One derived history. The root branch descends from the POD; forks create child branches with structural sharing (no copying; parent-chain walk up to the fork event) |
| **era** | A span of years on a branch; unit of generation (skeleton → expanded) |
| **dial** | Determinism control 0–100: butterfly (contingency compounds) → railroad (structural attractors pull history back) |
| **lens** | Register filter: political / technological / cultural / economic / daily-life, plus philology (v2/M18: the events that moved a name). All six are filterable; philology is the one lens a new chronicle does not switch on, because most eras never speak in it (`DEFAULT_LENSES`) |
| **convergence** | A divergent event that rhymes back into a real-history baseline anchor; surfaced as first-class marks |
| **disputed** | An event the critic kept flagging after bounded retries; kept, visibly marked, critic notes attached |
| **record vs. ink** | *Record* = curated real history (Prussian blue, `provenance: curated`). *Ink* = generated content (iron-gall ink, full provenance: model, template id+version, timestamp, mock/live) |
| **pressures** | 3–7 named tensions derived from world-state, feeding the next era's generation |
| **wildcard** | A low-structural-implication candidate event; the dial sets how many survive |
| **demo mode** | The user-facing name (v2/M13) for the keyless deterministic MockProvider engine: DEMO pill + composer banner say so; **live** = real API derivation. `mode: 'live' \| 'demo'` rides `/api/config` |
| **symposium** | Opt-in derivation (v2/M17): three specialist historians draft each era from their own disciplines, a fourth pass merges them. Roughly 4x the tokens of a standard era |
| **contested** | An event the symposium's chairs read differently. The synthesizer keeps one event and records the disagreement as marginalia; distinct from **disputed**, which is the critic's verdict |
| **the court** | The Court of Plausibility (v2/M17; opt-in): on a critic-disputed event, an advocate and a skeptic brief and a judge rules once (uphold / revise / dispute). At most 3 cases per era |
| **claim** | A structured assertion an era makes beyond any entity's ledger (v2/M18): a coarse regional index reading, or a name the divergence moved. Always bound to the event that asserted it |
| **epilogue** | One optional era past the horizon (v2/M18), openly a projection rather than a derivation, and marked as such wherever it renders |
| **pulse** | A forecast of one flip on one event (v2/M19). Costs a call, commits nothing, and the fork it proposes opens already worded |
| **graft** | Transplanting an event plus its direct consequences from one branch onto another leaf branch (v2/M19). Hard conflicts refuse; soft ones report, then land disputed under force |
| **school** | One of 2-3 rival in-world historiographic positions derived per branch (v2/M20), each with the blind spot its rivals name |
| **the book** | A branch compiled into a frontispiece, chapters, plates, and appendices (v2/M21), as print HTML or EPUB. Costs nothing: it arranges history already derived |
| **pin** | A citation handle (`E3`, `A1`, `C2`) in an archivist answer or an inquiry, resolving to a row the app can open (v2/M23) |
| **the gate** | The spending guard on a public deployment (v2/M24, ADR-0005): passphrase, per-IP rate limit, daily token ledger. On serverless, a key with neither a passphrase nor the public-live opt-in is refused and demo mode is forced |
| **public-live** | The posture (v2.1/M26, ADR-0006) in which anonymous visitors derive on the instance's own key, each on a per-visitor daily allowance. The passphrase, where one exists, stops being a door and becomes an override: the owner is not a visitor |

## 3. Architecture map

```
packages/schemas   Zod-first schemas + inferred types + fixtures (zero deps beyond zod)
  src/*.ts           one file per §3 type; llm.ts = draft shapes the LLM emits
  src/fixtures/      hand-built "Constantinople holds" world (import via @uchronia/schemas/fixtures)
packages/evals     Eval harness (v2/M15): bench.ts (31-POD benchmark), mock lane
                   (pnpm eval; CI + vitest), live lane + relevance judge + critic A/B
                   (local-only, budget-capped, key-gated). Thresholds: docs/EVALS.md.
packages/core      Pure engine. IO only via injected ports (provider/clock/rng/idgen).
  src/world.ts       World store: structural-sharing fork resolution, state replay,
                     derived entity endedness (endedEntities), in-place event replacement, guards
  src/heraldry.ts    procedural arms from an entity slug (v2/M20): pure,
                     deterministic, tincture rule enforced; served by the API
                     because web depends on schemas only
  src/validator.ts   machine validator (12 pure rules: the v1 nine + tech-prerequisite
                     DAG floors + demographic person-span + index-continuity
                     (v2/M18: a regional index must report its own arithmetic, and
                     a move past MAX_INDEX_DELTA needs a catastrophe named in the
                     note; the size check judges the ACTUAL movement, since `delta`
                     is where an understated jump would hide); plus the advisory
                     geographicAdvisories, warning-grade because event regions are inferred)
  src/pipeline/      run.ts (seed + era loop + convergence + claims; abort-aware),
                     plan.ts (era spans, resume, defaultHorizonYears: deep time to
                     the present, EPILOGUE_YEARS), critic.ts (dual review + cause
                     glossary, bounded revision fan-out, the Court of Plausibility),
                     symposium.ts (chooseSpecialists + deriveEraBySymposium),
                     claims.ts (index readings and name drift bound to committed
                     events), drafts.ts (LLM drafts→rows, batch-local slug
                     dedup), validate.ts (trial-apply on a clone; store-guard throws
                     become issues), regenerate.ts (in-place event retelling),
                     structured.ts (zod + repair loop + signal/usage + em-dash scrub
                     with empty-guard), context.ts (budgeted state summaries,
                     causal-annotated recents, summarizeIndices), relevance.ts
                     (batchReachesPod: the on-divergence drift tripwire), ctx.ts,
                     fork.ts, expand.ts, artifacts.ts, events.ts,
                     graft.ts (transplant across branches; validator-gated),
                     pulse.ts (the counterfactual pulse + cross-branch fates),
                     historiography.ts (schools + per-event interpretations),
                     ask.ts (one retrieval pass behind the archivist and the
                     grand inquiry; every citation pinned to a real row)
  src/prompts/       registry + templates (pod-interpret, pod-normalize, seed-consequences,
                     era-generate, era-specialist/era-synthesize, court-advocate/
                     -skeptic/-judge, convergence-scan, …) + fragments
  src/mock/          MockProvider + per-template handlers + flavor banks (era buckets incl. twentieth)
  src/retrieval.ts   anchor retrieval: tokenize + keyword/year scoring (v2/M14);
                     corpusSpecificity replaces word length as the specificity
                     measure (v2/M16), so a long function word never outranks a
                     short proper noun, and it sharpens as the baseline grows
  src/pod-sketch.ts  deterministic intake heuristics: named-event aliases with real
                     candidate mechanisms, strict year parsing, anchor snapping
  src/dial.ts        determinism dial → concrete generation parameters (§4.4)
  src/llm.ts         LLMProvider port (signal + usage) + provider error taxonomy
  src/ports.ts       Clock/IdGen ports (+ sequentialIdGen for deterministic tests)
  src/errors.ts      typed error taxonomy   src/rng.ts  seeded RNG
  src/baseline.ts    curated baseline loader; data/baseline.json (1578 curated anchors,
                     4000 BC to 2024, 54 centuries, 367 in the twentieth; dataset v2
                     with regions/tags/magnitude/attractorStrength, assembled and
                     validated by scripts/build-baseline.mjs)
apps/server        Hono. Routes + SSE, AnthropicProvider, Drizzle + better-sqlite3.
  src/gate.ts        the spending gate (v2/M24, ADR-0005; v2.1/M26, ADR-0006):
                     constant-time passphrase, per-IP window, UTC-day instance
                     ledger, per-visitor day ledger; isOwner (whose allowance
                     this is) is a different question from isUnlocked (whether
                     anything bars the request) and the two must not be
                     conflated; mounted in app.ts over provider-reaching routes
  src/metering.ts    every provider call charges both ledgers (v2.1/M26), by
                     wrapping LLMProvider.complete rather than by each route
                     remembering to; the caller rides an AsyncLocalStorage
                     scope the gate opens, which survives into the SSE stream
  src/book.ts        compileBook + renderBookHtml + renderEpub (v2/M21)
  src/config.ts      env parsing (empty vars mean unset; serverless detection);
                     ANTHROPIC_API_KEY lives here and only here
  src/deps.ts        ServerDeps injection (repo/provider/idgen/clock); tests build their own
  src/providers/     anthropic.ts: live provider (structured outputs, streaming,
                     truncation retry, abort passthrough, usage; injectable client + tests)
  src/app.ts         app factory + CORS/body-limit + error→HTTP mapping (incl.
                     malformed-JSON 400); src/index.ts = listener (UCHRONIA_HOST,
                     loads repo-root .env, real env wins) + optional static serving
  src/trace-sink.ts  Engine Room recorder: persists one row per provider call, prunes
                     to UCHRONIA_TRACE_RUNS runs per branch
  src/vercel.ts      serverless entry: app + demo seed (inlined ledger) behind a
                     hand-rolled (req, res) bridge (Vercel invokes Node-style and
                     its helpers pre-consume POST bodies; the bridge rebuilds them),
                     esbuild-bundled to dist/vercel.js by `build:vercel` (DEPLOY.md)
  src/seed-demo.ts   showcase seeding (bundled ledger or demo/ on disk)
  src/http-error.ts  ApiError  ·  src/test-helpers.ts  in-memory test app
  scripts/           copy-vercel-assets.mjs stages dist/drizzle + dist/fonts
  src/routes/        meta (config/baseline/live-check: 1-token key proof), timelines (CRUD+PATCH+
                     interpret (retrieval-grounded reading, creates nothing)+validated import+export),
                     branches (view + md/html export + leaf DELETE), generate (SSE;
                     persist-before-stream; per-branch lock; era healing; token ceiling),
                     expand (event/era/entity + regenerate-in-place), fork, artifacts,
                     traces (Engine Room: run-grouped summaries + full prompt/response)
  src/views.ts       assembleBranchView: World → BranchView
  src/exporters.ts   renderMarkdown + renderStaticHtml (self-contained, fonts embedded)
  src/db/            schema.ts (drizzle), client.ts (open+migrate), repo.ts
  drizzle/           committed SQL migrations (regenerate: pnpm migrate after schema edits)
apps/web           Vite + React. RED THREAD interface (docs/DESIGN.md is binding)
  src/styles/        index.css: all §7 tokens (Survey + Nitrate themes), fonts via @fontsource
  src/lib/           api.ts (typed client) · sse.ts + generation.ts (stream → query cache) ·
                     theme.tsx · thread-geometry.ts (red-thread curves) · gallery.ts · format.ts
  src/components/    Shell, Stamp, EventCard, EraHeader, RecordTick, ThreadOverlay,
                     DialControl, ForkDialog, ShortcutsDialog, ErrorBoundary
  src/views/         all lazy-loaded: Atlas (composer+interpretation card (M14: reading,
                     candidate chips, editable fields, Just-derive escape)+dial axes
                     flyout+derivation/court/epilogue toggles+catalogue (85 entries with
                     curated hints)+rename/burn dialogs+demo loader), TimelineView
                     (virtualized spine, search, multi-lens, stop control), EventDetail
                     (prev/next, retell, copy link, court transcript, convergence
                     explanation, name-drift gloss), Dossier (lives, tenures,
                     succession), DeltaView, CompareView, ArtifactReader, SettingsView,
                     RecordView (the record room at /record: read-only baseline browse),
                     EngineRoomView (per-branch trace inspector: runs, calls, prompt/
                     response panes, per-call cost)
  public/            brand assets: the seal (uchronia-logo.png) + favicon set
  e2e/               journey.spec.ts: the §11.3 Playwright journey (mock mode)
docs/              ARCHITECTURE, DATA_MODEL, GENERATION, DESIGN(+NOTES), TESTING,
                   DEPLOY, ROADMAP, adr/
demo/              the-unburnt-library.uchronia.json (showcase; one-click load from Atlas;
                   seeds empty databases when UCHRONIA_SEED_DEMO / Vercel; inlined into
                   the serverless bundle at build time)
scripts/           mirror-dist.mjs (web dist → root dist for Vercel) ·
                   verify-vercel.mjs (fake-Vercel staging smoke; `pnpm verify:vercel`) ·
                   build-baseline.mjs (validating baseline assembler, v2/M16) ·
                   check-secrets.mjs (key-material scan)
Dockerfile         single-container edition (mock by default; docs/DEPLOY.md)
api/index.mjs      Vercel function entry: a two-line re-export of the prebundled
                   apps/server/dist/vercel.js - no TS, no workspace resolution
vercel.json        Vercel deployment: pinned pnpm install (no corepack), prebundle +
                   static build + mirror, includeFiles apps/server/dist/**, rewrites
```

Dependency direction: web → server → core → schemas (schemas shared by all). The pipeline lives in `packages/core/src/pipeline/` (from M3); prompts in `packages/core/src/prompts/` (from M3).

## 4. Commands

```sh
corepack enable pnpm        # once per machine (pnpm 11.x)
pnpm install                # install everything

pnpm dev                    # server (8787) + web (5173) in parallel
pnpm dev:mock               # same, keyless demo mode + demo pacing (cross-platform)
pnpm dev:server             # server only (tsx watch)
pnpm dev:web                # web only (vite)
pnpm dev:preview            # demo mode with the server in-process (no tsx watch);
                            # used by .claude/launch.json for browser-pane previews
pnpm dev:preview:public     # same, but wearing the public-live posture (v2.1/M26)
                            # with a placeholder key, so the visitor-allowance and
                            # posture UI can be looked at without a real one

pnpm test                   # vitest, all packages
pnpm typecheck              # tsc --noEmit, all packages
pnpm lint                   # biome check (format + lint)
pnpm lint:fix               # biome check --write
pnpm build                  # all packages (web: vite build; server: esbuild bundle)
pnpm migrate                # drizzle-kit generate: new migration after schema edits
                            # (migrations APPLY automatically at server start)
pnpm e2e                    # playwright mock-mode journey (boots server+web itself, keyless,
                            # on an in-memory DB so every run starts on an empty shelf;
                            # first run: pnpm --filter @uchronia/web exec playwright install chromium)
pnpm verify:vercel          # build the serverless bundle, stage it as Vercel ships it,
                            # smoke it with real requests (CI runs this on ubuntu)
pnpm check:secrets          # scan working tree + staged diff for key material
                            # (CI runs it; run before every push)
pnpm eval                   # mock eval lane: 31-POD intake benchmark, keyless (CI runs it)
pnpm eval:report            # same, and rewrite docs/evals/mock-lane.md
pnpm eval:live              # judged live lane (LOCAL ONLY, needs key, budget-capped)
pnpm eval:critic            # critic A/B vs seeded violations (LOCAL ONLY; --mock = plumbing)
node scripts/build-baseline.mjs <batches...>   # reassemble data/baseline.json
node scripts/build-showcases.mjs               # re-derive the demo/ chronicles
```

Node ≥ 22.13 (pnpm 11.16's own engine floor; `.nvmrc` pins 22.13).

Per package: `pnpm --filter @uchronia/<schemas|core|server|web> <script>`.

## 5. Environment variables

| Var | Effect when set | Effect when absent |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live generation (server-side only; never logged, never sent to client) | App degrades to mock mode |
| `UCHRONIA_MOCK=1` | Forces the deterministic demo engine (MockProvider) everywhere, even with a key (CI always sets this) | Live if key present, else demo |
| `UCHRONIA_MODEL_GENERATION` | Overrides generation model (must support structured outputs) | `claude-sonnet-5` |
| `UCHRONIA_MODEL_CRITIC` | Overrides critic/utility model | `claude-haiku-4-5-20251001` |
| `UCHRONIA_PORT` | Server port | `8787` |
| `UCHRONIA_HOST` | Listener bind interface | `127.0.0.1` (Docker image sets `0.0.0.0`) |
| `UCHRONIA_DB` | SQLite file path | `./data/uchronia.db` (resolved absolute, logged at boot); `/tmp/uchronia.db` on serverless (Vercel/Lambda) |
| `UCHRONIA_MAX_RUN_TOKENS` | Per-run token ceiling (live) | `3000000`; `0` disables |
| `UCHRONIA_TRACE_RUNS` | Engine Room retention: traced runs kept per branch (`0` disables tracing) | `20`; `3` on serverless |
| `UCHRONIA_MOCK_PACE_MS` | Mock demo pacing per event | `0` (`dev:mock` sets 250; 250 under Vercel) |
| `UCHRONIA_STATIC_DIR` | Serve built web app from server | unset (dev uses vite proxy) |
| `UCHRONIA_CORS_ORIGINS` | CORS allowlist (comma-separated) | empty = same-origin only |
| `UCHRONIA_SEED_DEMO` | Seed the showcases into an empty DB at boot | off locally; on under Vercel |
| `UCHRONIA_ACCESS_TOKEN` | The passphrase that unlocks spending (v2/M24). On serverless, a key needs this **or** `UCHRONIA_PUBLIC_LIVE`, else demo mode is forced and the key is dropped | unset = ungated locally, demo-only on serverless |
| `UCHRONIA_PUBLIC_LIVE` | Anonymous visitors may derive on this instance's key (v2.1/M26, ADR-0006). Never inferred: it is how an owner says the spending is the public's. Turning it on turns on all three meters below | off = a key on serverless needs the passphrase |
| `UCHRONIA_DAILY_TOKEN_BUDGET` | Tokens this instance may spend per UTC day; `0` disables | `0` locally; `2000000` when exposed (serverless or public-live) |
| `UCHRONIA_VISITOR_TOKEN_BUDGET` | Tokens one anonymous caller may spend per UTC day (v2.1/M26); `0` disables. An unlocked session is not a visitor and is not charged against it | `150000` under public-live; `0` otherwise |
| `UCHRONIA_RATE_LIMIT` | Requests per minute per IP on spending routes; `0` disables | `0` locally; `20` when exposed |

Set-but-empty variables count as unset (a copied template can't silently disable defaults). `pnpm dev`/`dev:server` load a repo-root `.env` (real environment always wins); tests and the serverless entry never do.

## 6. Data model & pipeline

- Schemas are Zod-first in `packages/schemas`; everything an LLM produces is validated before touching any store. Summary + fork semantics: [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
- Pipeline: POD intake 2.0 (interpret against retrieved anchors → user confirms on the card) → seed consequences → era loop (snapshot + pressures + dial → generate, standard or symposium → validate → critique incl. on-divergence → accept/regenerate/dispute → the court, when enabled → drift tripwire → claims) → convergence scan; optional epilogue era; lazy expanders for detail/biographies/artifacts. Details + prompt registry + dial mapping: [docs/GENERATION.md](docs/GENERATION.md).
- Design system RED THREAD: [docs/DESIGN.md](docs/DESIGN.md), finalized before the first UI commit (§7.8) and binding for all UI work; realization log in [docs/DESIGN_NOTES.md](docs/DESIGN_NOTES.md). Two hard rules worth repeating: record blue is reserved for attested history, thread red for divergence/causality; neither is ever decoration.

## 7. Engineering conventions

- **Commits**: Conventional Commits, `type(scope): imperative subject ≤ 72 chars`. Types: feat fix test docs chore refactor perf ci. Scopes: repo schemas core server web prompts design docs ci evals maps. Atomic: one logical change (+ its tests + its doc updates); never mix features, or refactor with feature. 5–15 commits per milestone. Push at milestone boundaries.
- **Code**: TS strict, no `any` (Biome enforces). `packages/core` stays pure (IO via injected ports only). All LLM output Zod-validated at the boundary. Typed error taxonomy. Secrets never logged/committed/sent to client: the key lives only in the untracked `.env` (local) and the Vercel dashboard; docs use placeholders; `pnpm check:secrets` scans the tree and staged diff (CI enforces it, and it runs before every push).
- **No em dashes, anywhere**: not in docs, comments, UI strings, or data (per user direction, 2026-07-26; generated prose was already banned from them). Use commas, colons, hyphens, or parentheses; en dashes for year ranges are fine. The only exceptions are the machinery that has to contain the character in order to detect or eliminate it: the scrubber and its fixtures (`packages/core/src/pipeline/structured.ts` + `.test.ts`), the baseline assembler's check (`scripts/build-baseline.mjs`), and the critic A/B's seeded tone violation (`packages/evals/src/critic-ab.ts`), which is a planted failure the critic is supposed to catch.
- **Tests**: matrix in [docs/TESTING.md](docs/TESTING.md). A milestone is done only when its acceptance criteria pass.
- **Docs**: see the sync directive below. ADRs in `docs/adr/` for every deviation from the master prompt.
- **Sensitive history**: every generation prompt embeds a sober historiographic register; no glorification of atrocity; the critic treats tonal violations as failures. README carries the speculative-fiction disclaimer.

## 8. Current status

**M26 (2026-07-30, post-v2.0.0): the public-live posture.** ADR-0006 amends
ADR-0005. A serverless key may now go live for anonymous visitors under
`UCHRONIA_PUBLIC_LIVE=1`, metered by a per-visitor daily allowance on top of the
existing instance ledger and rate limit; the passphrase, where one is also set,
becomes an override rather than a door. Two things came out of building it that
outlive the feature: metering moved from the generation route into a wrapper
around `LLMProvider.complete`, because six other routes reach the provider and
none of them were charging anything; and `isOwner` was split from `isUnlocked`,
because the latter reports true whenever no passphrase is configured and would
have metered nobody on exactly the instance that needed metering.

**v2.0.0 "The Second Derivation" shipped 2026-07-30.** All thirteen milestones M13-M25 are complete; the full record, including everything deliberately not built, is in [docs/ROADMAP.md](docs/ROADMAP.md) and [CHANGELOG.md](CHANGELOG.md). In brief: **M13** honest demo mode, the live check, and the cost meter; **M14** POD Intake 2.0 and the relevance guard (the failure v2 exists for); **M15** the eval harness, the Engine Room, validator rules 10-11, fuzzing; **M16** Baseline 2.0 (203 anchors to 1578, corpus-derived retrieval specificity, the record room); **M17** the Symposium and the Court, dial axes; **M18** lives, deep time, Convergence 2.0, claims, the philology lens, rule 12; **M19** the pulse, the graft, cross-branch fates; **M20** four new artifact kinds, procedural heraldry, in-world historiography; **M21** the Book, in print HTML and EPUB; **M22** region-control claims, the map, the command palette; **M23** the archivist and the grand inquiry, every sentence pinned; **M24** the spending gate (ADR-0005) and prompt caching; **M25** three more showcases and the release.

**The WW2 gate, demo half: passes** (card offers the real mechanisms, POD lands 1939-1945, `demo/the-allies-lose.uchronia.json` runs 1940-2024 on subject). **Live half: deferred to the deployment per ADR-0004** - no key has ever been in this tree, every live path is stub-tested, and the live eval lane is one command from running on a machine that has one. **Build-time API spend for the whole v2 program: zero.**

**v1.0.0 (2026-07-26) = v0.1.0 + the 0.2 hardening series (2026-07-23) + the deployment-hardening pass (2026-07-26)**: all milestones M0–M12 complete, then a ~15-commit audit-driven pass (graph-fed generation, region-aware convergence, entity lifecycle/9th validator rule, dial-aware critic, generation locking + import validation + era healing, abort/usage/cost ceiling, lifecycle routes, web code-splitting, CI matrix, Docker), then a full line-by-line audit that rebuilt the Vercel chain on a prebundled function (`build:vercel` → `api/index.mjs`, with a body-reconstructing `(req, res)` bridge for the Node runtime's helpers), pinned the toolchain (Node ≥ 22.13, pnpm without corepack), moved the generation default to a structured-outputs-capable model (`claude-sonnet-5`), added the fake-Vercel smoke (`pnpm verify:vercel`, CI `vercel-shape` job), fixed a dozen audit-found bugs across core/server/web, and removed em dashes repo-wide. See [docs/ROADMAP.md](docs/ROADMAP.md) for the honest record and open threads (notably: live mode is provider-unit-tested and cost-capped but still unexercised against the real API from this machine). The Vercel deployment is live at <https://uchronia-server.vercel.app/> (confirmed 2026-07-26). The full mock-mode product works keyless: `pnpm dev:mock`, then "load the showcase chronicle" on the empty Atlas. Deployment posture: [docs/DEPLOY.md](docs/DEPLOY.md) + ADR-0003 (mock is public, live is local).

## 9. Documentation sync directive (binding)

Every change to code, schemas, prompts, commands, dependencies, repository structure, or behavior MUST be reflected in this file and in every affected document under `docs/` within the same commit series as the change itself. Documentation drift is treated as a failing build. Before ending any session: re-read this file top to bottom and fix anything no longer true; update `docs/ROADMAP.md` to reflect actual status; record anything unfinished. Future agents: you are bound by this directive too.
