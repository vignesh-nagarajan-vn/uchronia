# Generation pipeline

## Stages (§4.1)

1. **POD intake** ✅: freeform text → normalized `PointOfDivergence` + baseline-context summary (runs inside `POST /api/timelines`)
2. **Seed consequences** ✅: years ~0–2 after the POD, 3–5 high-confidence events (no wildcards, plausibility ≥ 0.6), founding the entity roster
3. **Era loop** ✅, per era: `derive-pressures` (3–7 tensions read off the state, §4.3) → `era-generate` (snapshot + pressures + dial + distance) → dual review → commit → convergence scan. One `POST /api/branches/:id/generate` runs seed + all eras to the horizon.
4. **Convergence scan** ✅: after each era, accepted events are compared against nearby baseline anchors; genuine matches become `ConvergencePoint`s and flag their events (P3)
5. **Lazy expanders** ✅: event detail (conditioned on causes/effects and the state *as of that event*), era deep-dives (essay over pressures + events, flips status to `expanded`), and branch-local biographies (held to every ledger line). All fill exactly once; detail on a shared pre-fork event is the same history for every descendant, so the fill is shared. Routes: `POST /api/branches/:b/events/:id/expand` · `/eras/:id/expand` · `/entities/:id/biography`. Artifacts land at M8.
6. **Branch fork** ✅: `POST /api/branches/:id/fork {eventId, name?, subPodText?}`: the optional sub-POD is normalized to a clean statement; the child's era plan starts at the fork year (2-year sub-seed window, then widening) and its first own era opens with the sub-divergence landing. `GET /api/compare?a=&b=` aligns two branches (shared prefix + divergence point) or a branch against the curated record (`b=baseline`).

**Parallel-branch slugs.** Slugs are timeline-unique but visibility is branch-local, so a branch may introduce an entity whose slug lives on a segment it cannot see (a live model couldn't know either). Draft resolution renames deterministically (`slug-2`, …) with a streamed warning; batch-internal references keep the original handle.

## Era planning & resume

`planEraSpans(originYear, horizonEnd)` (`core/src/pipeline/plan.ts`) fixes a branch's era plan up front: a 2-year seed window, then Fibonacci-widening spans (8, 13, 21, 34, 55, …): disciplined near the POD, roomy decades out (P2). Era ordinals index straight into the plan, so **an interrupted run resumes at `plan[ownEras.length]`**: no reseeding, no duplicates. Batch size grows with distance: `4 + min(3, ⌊distance/40⌋)`. Origin year is the POD for roots, the fork event's year for children (M7), and **P2 discipline is measured from the branch's own origin**: a branch forked a century downstream still opens with a tight, wildcard-free first era (`podDistanceYears` separately tells the prompt how far the root divergence lies).

## Structured output

All LLM output is structured JSON validated against `packages/schemas`. Every call flows through `generateStructured` (`core/src/pipeline/structured.ts`): parse → Zod-validate → bounded repair loop (max 2 re-asks with the validation errors attached) → `GenerationValidationError`, loudly. Calls carry the run's `AbortSignal` (checked before every attempt and passed into the provider's HTTP layer) and report `TokenUsage` into the ctx's usage sink; the server sums it against `UCHRONIA_MAX_RUN_TOKENS` (default 3M tokens/run; 0 disables) and aborts cleanly at the ceiling.

The live `AnthropicProvider` (`apps/server/src/providers/anthropic.ts`) uses the SDK's current structured-output mechanism (`output_config.format` via `zodOutputFormat`) with streaming (`messages.stream` + `finalMessage`) so era batches stay under HTTP timeouts, SDK retry/backoff for 429/5xx, one automatic retry with a doubled budget on `max_tokens` truncation (ceiling 16k), abort-signal passthrough, per-call token usage, and the typed provider error taxonomy at the boundary (user aborts map to `GenerationAbortedError`). Because strict structured outputs require `additionalProperties: false`, LLM-facing state patches travel as `{key, value}` fact lists, folded into `StateRecord`s at draft resolution.

Handles, never ULIDs: entity **slugs**, `e<n>` = 1-based position in the branch's visible history at batch start, `d<n>` = the model's own drafts. The graph feeds the loop, not just the UI: recent-event summaries carry each event's causal parents as `[from e<n>, …]`, era-generate is mandated to extend or close those chains, the critic receives every cited cause resolved to its title (`buildCauseGlossary`) so implausible-leap is actually judgeable, and `derive-pressures` receives the previous era's pressures with orders to carry, escalate, or discharge each one. Draft resolution (`core/src/pipeline/drafts.ts`) mints ids, resolves refs, computes `distanceFromPod`, and treats unknown references as machine-fixable (dropped with a streamed warning). Every batch is trial-applied to a **clone** of the world and machine-validated before anything commits.

## Streaming protocol (§4.8)

`POST /api/branches/:id/generate` returns SSE. Each frame's `event:` is the pipeline event type; `data:` is the JSON `PipelineEvent`:

`run.started` → (`era.started` → (`entity.created`* `event.accepted`)* `era.completed`)* → `run.completed`, with `warning` frames interleaved and `run.error {code, message}` on failure. `event.disputed`, `critique.completed` (M4) and `convergence.found` (M5) join the era cycle. Every mutation is **persisted before it is streamed**: what the client saw is what the database holds; a client abort cancels in-flight provider calls via the AbortSignal and keeps everything accepted so far. One run per branch at a time: a concurrent `POST` 409s (`generation-active`), with a unique `(branch_id, ordinal)` index as the database backstop. Before a run starts, a half-persisted trailing era from a crash (events but no critique report) is rolled back and regenerated, with a streamed warning. `run.completed` carries the run's summed token usage; a budget-ceiling stop streams `run.error {code: "budget-exceeded"}`. In mock mode `UCHRONIA_MOCK_PACE_MS` (set by `pnpm dev:mock` to 250) holds each accepted event briefly so the ink-in is visible.

## Model routing

| Role | Default | Env override |
| --- | --- | --- |
| generation | `claude-sonnet-4-6` | `UCHRONIA_MODEL_GENERATION` |
| critic + cheap utility | `claude-haiku-4-5-20251001` | `UCHRONIA_MODEL_CRITIC` |

Role → model happens inside the provider; templates declare `role`. Mock mode (`UCHRONIA_MOCK=1`, or no key present) swaps the whole app onto the deterministic `MockProvider`: seeded per request, identical inputs → identical fixtures; arbitrary PODs work (intake reads years/mechanism/region from text, including aviation-age technology and North American markers; seed generation draws period- and region-appropriate names from era-bucketed flavor banks, with seeded sentence variants and six titles per mechanism so parallel ledgers read differently). CI runs exclusively in mock.

## Dial mapping (§4.4)

`core/src/dial.ts`: `dialParams(dial)` with `r = dial/100`:

| Effect | Mapping |
| --- | --- |
| (a) Prompt language | Three bands (butterfly < 34, balanced 34–66, railroad > 67), each with attractor-strength wording embedding the numeric dial, injected into every generation system prompt |
| (b) Wildcard budget | `round(lerp(3 → 0.4, r) × min(1, distance/60))` per batch: more wildcards for butterfly histories, none near the POD for anyone |
| (c) Convergence pressure | `r` (0–1), fed to the pressures step (M5); the attractor block is always present when anchors exist, its stance graded by band (context-only for butterfly, may-pull for balanced, should-pull for railroad), so no mid-band cliff |
| (d) Wildcard plausibility floor | `lerp(0.15 → 0.45, r)`: wildcards scoring below the floor are discarded before commit |

The **critic is dial-aware**: its system prompt embeds the same attractor language and instructs that under a low dial, surprising-but-caused outcomes are the intended product: implausible-leap weighs whether cited causes carry the outcome, never resemblance to the familiar record.

## Prompt registry (§4.7)

Templates in `packages/core/src/prompts/`, one file each, `id` + semver `version` + changelog. Shared fragments (`fragments.ts`, v1.1.0): `ANTI_CLICHE_MANDATES` (P6), `SENSITIVE_HISTORY_STANCE` (§12), `HUMAN_VOICE` (the humanity mandate: chronicler's hand, banned stock phrasing, no em dashes), `HANDLE_CONVENTIONS`. The dial adds `voiceLanguage`, a prose register that frays at butterfly settings (clipped entries, asides, un-erased corrections) and steadies to a clerk's calm at railroad; every reader-facing template embeds it. Belt and suspenders: `generateStructured` scrubs any em dash out of validated output before it can reach a store (en dashes in ranges survive).

| Template | Purpose | Version | Role |
| --- | --- | --- | --- |
| `pod-normalize` | Freeform POD → normalized record + baseline context | 1.0.0 | utility |
| `seed-consequences` | First 0–2 years: disciplined events + entity roster + era header | 1.1.0 | generation |
| `critic-review` | Skeptical-historian verdicts over one draft batch (dial-calibrated; causes arrive resolved; machine mannerisms are tone violations) | 1.2.0 | critic |
| `regenerate-event` | One bounded replacement for a flagged draft; also drives the user-facing `POST …/events/:id/regenerate` (a fresh telling in place, clone-validated) | 1.1.0 | generation |
| `derive-pressures` | 3–7 named tensions from the state snapshot (+ graded attractor pull; previous pressures must be carried or discharged) | 1.2.0 | critic |
| `era-generate` | One era of consequences from snapshot + pressures + dial + distance (chain-extension mandate; entity lifecycle via `ends:true`) | 1.3.0 | generation |
| `convergence-scan` | Conservative rhyme-detection against baseline anchors (theatre-aware) | 1.2.0 | critic |
| `event-expand` | Expanded narrative from state-at-event + causal neighborhood | 1.1.0 | generation |
| `era-deepdive` | Era essay over pressures and events | 1.1.0 | generation |
| `entity-biography` | In-timeline biography held to the ledger | 1.1.0 | generation |
| `artifact-newspaper` | Diegetic front page (era-appropriate masthead, columns, notices) | 1.1.0 | generation |
| `artifact-letter` | Diegetic personal letter (news arriving slantwise) | 1.1.0 | generation |
| `artifact-encyclopedia` | Entry from an in-world reference work, decades on | 1.1.0 | generation |
| `artifact-poster` | Proclamation / bill / propaganda sheet with an issuer | 1.1.0 | generation |

**Artifacts (F8):** `POST /api/branches/:b/events/:id/artifacts {kind}`: conditioned on the state *as of the event*, one document per (event, kind); asking again returns the same document (the reader deserves a stable source). All four are HTML/CSS typographic compositions client-side; no image generation.

## Baseline dataset

`packages/core/data/baseline.json`: **203 hand-curated anchors** spanning 4000 BC → 2000 CE across every region and all five lenses (`provenance: "curated"`). Powers the record spine (F7), convergence candidates (anchors within an era-width+25y window of each era's midpoint), and the pressures step's attractor hints. `anchorsNear` ranks by **theatre before year**: same region (or global) first, adjacent regions second, the rest in the tail: an Alexandrian divergence no longer draws its attractors from Ming China, while off-region anchors still fill sparse periods. The scan prompt names each candidate's theatre and demands the causal road for any cross-theatre match.

**State snapshot budgeting.** `summarizeState` ranks entities by how recently history touched them, withholds the coldest beyond a cap (default 40, with an honest count), trims each line to its most recently written facts (default 14), and collapses ended entities into a terse `no longer extant` line; late-era prompts stop growing without bound.

**Entity lifecycle.** A delta may carry `ends: true` (death, dissolution). Endedness is replay-derived and therefore branch-local for free; the roster drops the dead, the validator's `no-posthumous-mutation` rule makes them unarguable, and era-generate is told that people age.

## Dual review: critic rubric & retry flow (§4.5, P4)

Every batch passes two reviewers in `refineBatch` (`core/src/pipeline/critic.ts`):

1. **Machine validator**: the batch is trial-applied to a clone of the world; rule failures are attributed back to draft refs. Machine rules cannot be argued with.
2. **Critic** (`critic-review`, critic-tier model): a skeptical historian judging ONLY against the state snapshot, prior events, the POD, and the rubric: *anachronism · contradiction-with-state · implausible-leap · teleology · great-man-overreach · presentism · cliche-collapse · tone*. It verdicts, never rewrites: **pass** (commit; "note" issues allowed) · **revise** (fixable; worth one regeneration) · **dispute** (unsound in a way regeneration won't fix; keep it visible with notes).

Retry flow, bounded at 2 revisions per batch:

```
drafts → [wildcards under the dial floor discarded]
       → assess (machine + critic)
       → while any draft has machine failures or verdict=revise (≤2 rounds):
           regenerate-event per flagged draft (issues attached) → re-assess
       → sentence:
           machine still failing → DROPPED (warning streamed)
           critic still objecting → COMMITTED, flags.disputed + criticNotes attached
           otherwise → committed clean
       → CritiqueReport persisted; critique.completed streamed
```

An entirely-dropped batch raises `GenerationValidationError` (fails loudly). A convergence-scan failure after the era has committed degrades to a streamed warning (the era stands, unscanned), since aborting would strand a half-finished era for resume to skip. Disputed events flow through the normal `event.accepted` SSE frame with `flags.disputed` set: the ledger shows the mark and the critic's notes travel with the event.
