# CLAUDE.md: agent onboarding contract

This file is the single source of truth for any agent session in this repository. A fresh agent reading only this file must be able to work productively. **Last verified: 2026-07-23 (v0.1.0 + the 0.2 hardening series).**

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
| **lens** | Register filter: political / technological / cultural / economic / daily-life |
| **convergence** | A divergent event that rhymes back into a real-history baseline anchor; surfaced as first-class marks |
| **disputed** | An event the critic kept flagging after bounded retries; kept, visibly marked, critic notes attached |
| **record vs. ink** | *Record* = curated real history (Prussian blue, `provenance: curated`). *Ink* = generated content (iron-gall ink, full provenance: model, template id+version, timestamp, mock/live) |
| **pressures** | 3–7 named tensions derived from world-state, feeding the next era's generation |
| **wildcard** | A low-structural-implication candidate event; the dial sets how many survive |

## 3. Architecture map

```
packages/schemas   Zod-first schemas + inferred types + fixtures (zero deps beyond zod)
  src/*.ts           one file per §3 type; llm.ts = draft shapes the LLM emits
  src/fixtures/      hand-built "Constantinople holds" world (import via @uchronia/schemas/fixtures)
packages/core      Pure engine. IO only via injected ports (provider/clock/rng/idgen).
  src/world.ts       World store: structural-sharing fork resolution, state replay,
                     derived entity endedness (endedEntities), in-place event replacement, guards
  src/validator.ts   machine validator (9 pure rules incl. no-posthumous-mutation)
  src/pipeline/      run.ts (seed + era loop + convergence; abort-aware), plan.ts (era
                     spans, resume), critic.ts (dual review + cause glossary), drafts.ts
                     (LLM drafts→rows), regenerate.ts (in-place event retelling),
                     structured.ts (zod + repair loop + signal/usage), context.ts
                     (budgeted state summaries, causal-annotated recents), events.ts
  src/prompts/       registry + templates (pod-normalize, seed-consequences, …) + fragments
  src/mock/          MockProvider + per-template handlers + flavor banks
  src/dial.ts        determinism dial → concrete generation parameters (§4.4)
  src/llm.ts         LLMProvider port (signal + usage) + provider error taxonomy
  src/ports.ts       Clock/IdGen ports (+ sequentialIdGen for deterministic tests)
  src/errors.ts      typed error taxonomy   src/rng.ts  seeded RNG
  src/baseline.ts    curated baseline loader; data/baseline.json (203 curated anchors)
apps/server        Hono. Routes + SSE, AnthropicProvider, Drizzle + better-sqlite3.
  src/config.ts      env parsing; ANTHROPIC_API_KEY lives here and only here
  src/deps.ts        ServerDeps injection (repo/provider/idgen/clock); tests build their own
  src/providers/     anthropic.ts: live provider (structured outputs, streaming,
                     truncation retry, abort passthrough, usage; injectable client + tests)
  src/app.ts         app factory + CORS/body-limit + error→HTTP mapping;
                     src/index.ts = listener + optional static web serving (DEPLOY.md)
  src/routes/        meta (config/baseline), timelines (CRUD+PATCH+validated import+export),
                     branches (view + md/html export + leaf DELETE), generate (SSE;
                     persist-before-stream; per-branch lock; era healing; token ceiling),
                     expand (event/era/entity + regenerate-in-place), fork, artifacts
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
  src/views/         all lazy-loaded: Atlas (composer+catalogue+rename/burn dialogs+
                     demo loader), TimelineView (virtualized spine, search, multi-lens,
                     stop control), EventDetail (prev/next, retell, copy link), Dossier,
                     DeltaView, CompareView, ArtifactReader, SettingsView
  e2e/               journey.spec.ts: the §11.3 Playwright journey (mock mode)
docs/              ARCHITECTURE, DATA_MODEL, GENERATION, DESIGN(+NOTES), TESTING, ROADMAP, adr/
demo/              the-unburnt-library.uchronia.json (showcase; one-click load from Atlas)
Dockerfile         single-container edition (mock by default; docs/DEPLOY.md)
```

Dependency direction: web → server → core → schemas (schemas shared by all). The pipeline lives in `packages/core/src/pipeline/` (from M3); prompts in `packages/core/src/prompts/` (from M3).

## 4. Commands

```sh
corepack enable pnpm        # once per machine (pnpm 11.x)
pnpm install                # install everything

pnpm dev                    # server (8787) + web (5173) in parallel
pnpm dev:mock               # same, keyless mock mode + demo pacing (cross-platform)
pnpm dev:server             # server only (tsx watch)
pnpm dev:web                # web only (vite)

pnpm test                   # vitest, all packages
pnpm typecheck              # tsc --noEmit, all packages
pnpm lint                   # biome check (format + lint)
pnpm lint:fix               # biome check --write
pnpm build                  # all packages (web: vite build; server: esbuild bundle)
pnpm migrate                # drizzle-kit generate: new migration after schema edits
                            # (migrations APPLY automatically at server start)
pnpm e2e                    # playwright mock-mode journey (boots server+web itself, keyless;
                            # first run: pnpm --filter @uchronia/web exec playwright install chromium)
```

Per package: `pnpm --filter @uchronia/<schemas|core|server|web> <script>`.

## 5. Environment variables

| Var | Effect when set | Effect when absent |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Live generation (server-side only; never logged, never sent to client) | App degrades to mock mode |
| `UCHRONIA_MOCK=1` | Forces deterministic MockProvider everywhere (CI always sets this) | Live if key present, else mock |
| `UCHRONIA_MODEL_GENERATION` | Overrides generation model | `claude-sonnet-4-6` |
| `UCHRONIA_MODEL_CRITIC` | Overrides critic/utility model | `claude-haiku-4-5-20251001` |
| `UCHRONIA_PORT` | Server port | `8787` |
| `UCHRONIA_DB` | SQLite file path | `./data/uchronia.db` (resolved absolute, logged at boot) |
| `UCHRONIA_MAX_RUN_TOKENS` | Per-run token ceiling (live) | `3000000`; `0` disables |
| `UCHRONIA_MOCK_PACE_MS` | Mock demo pacing per event | `0` (`dev:mock` sets 250) |
| `UCHRONIA_STATIC_DIR` | Serve built web app from server | unset (dev uses vite proxy) |
| `UCHRONIA_CORS_ORIGINS` | CORS allowlist (comma-separated) | empty = same-origin only |

## 6. Data model & pipeline

- Schemas are Zod-first in `packages/schemas`; everything an LLM produces is validated before touching any store. Summary + fork semantics: [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
- Pipeline: POD intake → seed consequences → era loop (snapshot + pressures + dial → validate → critique → accept/regenerate/dispute) → convergence scan; lazy expanders for detail/biographies/artifacts. Details + prompt registry + dial mapping: [docs/GENERATION.md](docs/GENERATION.md).
- Design system RED THREAD: [docs/DESIGN.md](docs/DESIGN.md), finalized before the first UI commit (§7.8) and binding for all UI work; realization log in [docs/DESIGN_NOTES.md](docs/DESIGN_NOTES.md). Two hard rules worth repeating: record blue is reserved for attested history, thread red for divergence/causality; neither is ever decoration.

## 7. Engineering conventions

- **Commits**: Conventional Commits, `type(scope): imperative subject ≤ 72 chars`. Types: feat fix test docs chore refactor perf ci. Scopes: repo schemas core server web prompts design docs ci. Atomic: one logical change (+ its tests + its doc updates); never mix features, or refactor with feature. 5–15 commits per milestone. Push at milestone boundaries.
- **Code**: TS strict, no `any` (Biome enforces). `packages/core` stays pure (IO via injected ports only). All LLM output Zod-validated at the boundary. Typed error taxonomy. Secrets never logged/committed/sent to client.
- **Tests**: matrix in [docs/TESTING.md](docs/TESTING.md). A milestone is done only when its acceptance criteria pass.
- **Docs**: see the sync directive below. ADRs in `docs/adr/` for every deviation from the master prompt.
- **Sensitive history**: every generation prompt embeds a sober historiographic register; no glorification of atrocity; the critic treats tonal violations as failures. README carries the speculative-fiction disclaimer.

## 8. Current status

**v0.1.0 shipped + the 0.2 hardening series landed (2026-07-23)**: all milestones M0–M12 complete, then a ~15-commit audit-driven pass: graph-fed generation, region-aware convergence, entity lifecycle (9th validator rule), dial-aware critic, generation locking + import validation + era healing, abort/usage/cost ceiling, lifecycle routes (PATCH timeline, regenerate event, delete branch), web code-splitting + interaction depth, CI matrix, Docker. See [docs/ROADMAP.md](docs/ROADMAP.md) for the honest record and open threads (notably: live mode is provider-unit-tested and cost-capped but still unexercised against the real API from this machine). The full mock-mode product works keyless: `pnpm dev:mock`, then "load the showcase chronicle" on the empty Atlas. Deployment posture: [docs/DEPLOY.md](docs/DEPLOY.md) + ADR-0003 (mock is public, live is local).

## 9. Documentation sync directive (binding)

Every change to code, schemas, prompts, commands, dependencies, repository structure, or behavior MUST be reflected in this file and in every affected document under `docs/` within the same commit series as the change itself. Documentation drift is treated as a failing build. Before ending any session: re-read this file top to bottom and fix anything no longer true; update `docs/ROADMAP.md` to reflect actual status; record anything unfinished. Future agents: you are bound by this directive too.
