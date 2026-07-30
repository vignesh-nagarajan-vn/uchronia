# Generation pipeline

## Stages (§4.1)

1. **POD intake** ✅ (2.0 in v2/M14): the composer calls `POST /api/timelines/interpret` first: server-side retrieval (`core/src/retrieval.ts`, keyword + year scoring, biased by the deterministic `pod-sketch` heuristics) feeds curated anchors into `pod-interpret` (generation tier), which returns the primary reading, a confidence, named ambiguities, 2-4 real candidate mechanisms, and at most one clarifying question. Nothing is created; the user confirms or edits on the interpretation card, and `POST /api/timelines` takes the confirmed reading verbatim (`provenance: user`). The old one-shot `pod-normalize` still serves fork sub-PODs and the power-user "Just derive" path. **Demo intake never rolls dice** (Mock 2.0): named-event aliases (WW2/WWII/world war two, WW1/great war, cold war, american civil war, french revolution) snap to the right years with canned real candidates; bare years need 3-4 digits (era markers for shorter); everything else snaps to the nearest anchor by keyword/year distance; true garbage gets a fixed neutral 1900 with low confidence and a clarifying question. Catalogue entries skip the call entirely (v2/M16): each of the 85 gallery divergences carries curated intake hints (statement, year, date label, baseline context) that prefill the same card, so one click composes rather than creating.
2. **Seed consequences** ✅: years ~0–2 after the POD, 3–5 high-confidence events (no wildcards, plausibility ≥ 0.6), founding the entity roster
3. **Era loop** ✅, per era: `derive-pressures` (3–7 tensions read off the state and the coarse regional dials, §4.3) → `era-generate` (snapshot + pressures + dial + distance), or the symposium in its place when `settings.derivation = 'symposium'` → dual review, optionally followed by the Court of Plausibility → commit → claims recorded → convergence scan. One `POST /api/branches/:id/generate` runs seed + all eras to the horizon, and (v2/M18) the horizon is the present day unless the request names a shorter road.
4. **Convergence scan** ✅: after each era, accepted events are compared against nearby baseline anchors; genuine matches become `ConvergencePoint`s and flag their events (P3). Since v2/M18 a match also names the attractor that pulled and, where the road differed, how
5. **Lazy expanders** ✅: event detail (conditioned on causes/effects and the state *as of that event*), era deep-dives (essay over pressures + events, flips status to `expanded`), and branch-local biographies (held to every ledger line). All fill exactly once; detail on a shared pre-fork event is the same history for every descendant, so the fill is shared. Routes: `POST /api/branches/:b/events/:id/expand` · `/eras/:id/expand` · `/entities/:id/biography`. Artifacts land at M8.
6. **Branch fork** ✅: `POST /api/branches/:id/fork {eventId, name?, subPodText?}`: the optional sub-POD is normalized to a clean statement; the child's era plan starts at the fork year (2-year sub-seed window, then widening) and its first own era opens with the sub-divergence landing. `GET /api/compare?a=&b=` aligns two branches (shared prefix + divergence point) or a branch against the curated record (`b=baseline`).

**Parallel-branch slugs.** Slugs are timeline-unique but visibility is branch-local, so a branch may introduce an entity whose slug lives on a segment it cannot see (a live model couldn't know either). Draft resolution renames deterministically (`slug-2`, …) with a streamed warning; batch-internal references keep the original handle.

## Era planning & resume

`planEraSpans(originYear, horizonEnd)` (`core/src/pipeline/plan.ts`) fixes a branch's era plan up front: a 2-year seed window, then Fibonacci-widening spans (8, 13, 21, 34, 55, …): disciplined near the POD, roomy decades out (P2). Era ordinals index straight into the plan, so **an interrupted run resumes at `plan[ownEras.length]`**: no reseeding, no duplicates. Batch size grows with distance: `4 + min(3, ⌊distance/40⌋)`. Origin year is the POD for roots, the fork event's year for children (M7), and **P2 discipline is measured from the branch's own origin**: a branch forked a century downstream still opens with a tight, wildcard-free first era (`podDistanceYears` separately tells the prompt how far the root divergence lies).

**Deep time (v2/M18).** `POST /api/timelines` defaults `horizonYears` to `defaultHorizonYears(pod.year, thisYear)` when the request does not name one: the distance from the divergence to the present, clamped to [60, 6000]. A 1453 divergence therefore runs to the present rather than stopping politely in 1600, a divergence inside living memory still gets road enough to derive anything at all, and `TimelineSettings.horizonYears` now allows up to 6000. Past the end of the width table `planEraSpans` keeps the Fibonacci sequence going instead of repeating the last width, so five thousand years costs a bounded number of eras (fewer than twenty) rather than one per century: deep time gets coarser the further it runs, which is also how it reads.

**The epilogue (v2/M18).** `settings.epilogue` appends exactly one further span of `EPILOGUE_YEARS = 50` past the horizon, and its era carries `speculative: true`. The flag reaches the prompt (the epilogue block tells `era-generate` to extend trends already on the ledger, introduce no new hinge, and write in the provisional tone of someone reasoning forward rather than reporting back) and every surface that renders the era. The span is pushed onto the same plan the loop indexes into, so ordinals still address it and an interrupted run still resumes by `plan[ownEras.length]`.

## Symposium derivation (v2/M17)

Opt-in per timeline (`settings.derivation = 'symposium'`, set in the composer). It replaces the single `era-generate` call with four, and costs roughly four times the tokens, which is why it is opt-in and the composer names the cost on the control.

`chooseSpecialists` (`core/src/pipeline/symposium.ts`) seats three chairs out of five (military, economic, cultural, technological, social) by summed pressure intensity. Each pressure kind lends its intensity to the chair that reads it best (demographic and environmental both to social, economic to economic, technological to technological, ideological to cultural). **No pressure kind maps to the military chair**, so it reads the era's temperature instead: every pressure at or above 0.6 intensity lends it half its weight, on the principle that a strain pressing that hard ends up costing somebody an army. A calm era never seats it; a boiling one seats it first. Ties break on the fixed domain order, so the bench is deterministic.

The three chairs then fan out in parallel through `era-specialist`, each asked for `max(3, ⌈batchSize × 0.7⌉)` events from its own vantage with `wildcard: false` throughout (the synthesizer allocates wildcards). One `era-synthesize` pass merges the drafts into exactly `batchSize` events, relabels the refs to `d1..dn`, rewrites causes to the new labels, and returns the readings the chairs genuinely could not settle as `contested` refs, each with a one-sentence marginal note naming both readings. A contested ref the synthesizer invented is dropped: there is nothing to attach it to. The era's provenance records the synthesizer, not the chairs.

Contested marks are applied after the dual review, to the events that actually committed: `flags.contested` plus a `criticNotes` entry of type `contested` and severity `note`, on top of whatever the critic decided. A `warning` frame names the chairs that sat.

## Claims: regional indices and name drift (v2/M18)

An era can now assert things no entity's ledger has room for. `era-generate` returns two optional lists beside its events: `indexShifts` (where the era left the coarse 0–100 regional dials) and `nameDrift` (names this history moved). Both are emitted **opportunistically inside the era call**, not by a separate pass: drift is rare enough that a dedicated call would spend tokens asking most eras for nothing.

`recordClaims` (`core/src/pipeline/claims.ts`) runs after the batch commits and binds the loose drafts to committed history:

- An index reading describes where the era *left* a region, so it hangs off the era's closing event and takes the era's end year. A name drift hangs off the event whose ref it names, at that event's year; a drift naming a ref that never committed is dropped, because there is nothing to attach it to.
- The `delta` is the pipeline's arithmetic, not the model's: it is the new reading minus what `World.regionalIndices(branchId)` held before the era, so it is computed from what that branch could actually see. Rule 12 then polices the result (see [DATA_MODEL.md](DATA_MODEL.md)): on a live run the size check is the one with teeth, since the arithmetic is the engine's own, while an imported chronicle gets both checks against numbers that came from somewhere else.
- Each claim streams as a `claim.recorded` frame and is persisted like everything else, which keeps claims branch-visible exactly when their events are.

`derive-pressures` (1.3.0) reads the dials back through `summarizeIndices` (`core/src/pipeline/context.ts`): the latest reading per region, pre-rendered as one line each ("- Mediterranean: economicVitality 54, population 47"), with the honest empty string when no era has moved anything yet, so early prompts carry no table of nothing. The prompt says what a fallen reading means (a region that has fallen far is under pressure whether or not the prose has said so). `era-generate` (1.5.0) receives the same summary as the readings "as this era opens".

**Lives.** The same template asks for the M18 entity fields: a `bornYear` when the record would fix one (birth, founding, first working example), `counterfactual: true` for a person or body this history invented and would otherwise pass off as attested, `succeedsSlug` when one actor takes up another's office or line, and a `role` fact in the delta whenever an event puts someone into an office. Draft resolution (`core/src/pipeline/drafts.ts`) carries all three onto the minted entity, defaulting an unstated birth to null and pointing succession at the drafted slug rather than any rename the batch forced. The role facts are the raw material `World.roleTenures` replays into tenures.

**The philology lens.** `LENSES` gains a sixth register, `philology` (`packages/schemas/src/lens.ts`): the events that moved a name, so a reader can follow how a history's vocabulary drifted from the attested one. It is narrower than the other five by design, no template asks for it, and the curated baseline does not speak it at all, because drift is a property of derived history rather than of the record.

## Convergence 2.0 (v2/M18)

A convergence now has to say why. `convergence-scan` (1.4.0) returns with each match an `attractor` from a fixed six (demographic, geographic, technological, economic, cultural, institutional) and a `pathNote`: one clause on how the road differed ("still emerges, but out of Korea rather than Mainz"), or null when this history simply arrived the usual way. Convergence without a named mechanism is coincidence, and coincidence is not a finding.

`latenessYears` is not asked for. The pipeline computes it as arithmetic in `runReviewedEra`: the committed event's year minus the anchor's year, positive for late and negative for early. A model can neither flatter the number nor fumble it, and the interesting convergences are exactly the ones that arrive off schedule. All three fields carry schema defaults (`institutional`, 0, null), so a pre-M18 export imports unchanged and a match from an older scan degrades quietly rather than failing validation.

## Structured output

All LLM output is structured JSON validated against `packages/schemas`. Every call flows through `generateStructured` (`core/src/pipeline/structured.ts`): parse → Zod-validate → bounded repair loop (max 2 re-asks with the validation errors attached) → `GenerationValidationError`, loudly. Calls carry the run's `AbortSignal` (checked before every attempt and passed into the provider's HTTP layer) and report `TokenUsage` into the ctx's usage sink; the server sums it against `UCHRONIA_MAX_RUN_TOKENS` (default 3M tokens/run; 0 disables) and aborts cleanly at the ceiling. The same boundary emits one **Engine Room trace** per call (v2/M15: template id + version, rendered prompt, raw response, summed usage, attempt count, final validation issues, timing) into an optional `onTrace` sink; the server persists these to `run_traces` (pruned to `UCHRONIA_TRACE_RUNS` runs per branch) and the per-branch Engine Room view makes every call inspectable.

The live `AnthropicProvider` (`apps/server/src/providers/anthropic.ts`) uses the SDK's current structured-output mechanism (`output_config.format` via `zodOutputFormat`) with streaming (`messages.stream` + `finalMessage`) so era batches stay under HTTP timeouts, SDK retry/backoff for 429/5xx, one automatic retry with a doubled budget on `max_tokens` truncation (ceiling 16k), abort-signal passthrough, per-call token usage, and the typed provider error taxonomy at the boundary (user aborts map to `GenerationAbortedError`). Because strict structured outputs require `additionalProperties: false`, LLM-facing state patches travel as `{key, value}` fact lists, folded into `StateRecord`s at draft resolution.

Handles, never ULIDs: entity **slugs**, `e<n>` = 1-based position in the branch's visible history at batch start, `d<n>` = the model's own drafts. The graph feeds the loop, not just the UI: recent-event summaries carry each event's causal parents as `[from e<n>, …]`, era-generate is mandated to extend or close those chains, the critic receives every cited cause resolved to its title (`buildCauseGlossary`) so implausible-leap is actually judgeable, and `derive-pressures` receives the previous era's pressures with orders to carry, escalate, or discharge each one. Draft resolution (`core/src/pipeline/drafts.ts`) mints ids, resolves refs, computes `distanceFromPod`, and treats unknown references as machine-fixable (dropped with a streamed warning). Every batch is trial-applied to a **clone** of the world and machine-validated before anything commits.

## Streaming protocol (§4.8)

`POST /api/branches/:id/generate` returns SSE. Each frame's `event:` is the pipeline event type; `data:` is the JSON `PipelineEvent`:

`run.started` → (`era.started` → (`entity.created`* `event.accepted`)* `era.completed`)* → `run.completed`, with `warning` frames interleaved and `run.error {code, message}` on failure. `critique.completed` (M4), `court.completed` (v2/M17, one per transcript, after the critique report), `claim.recorded` (v2/M18, one per index reading or name drift, after the court's transcripts) and `convergence.found` (M5) join the era cycle; disputed and contested events ride the normal `event.accepted` frame with their flags set. Every mutation is **persisted before it is streamed**: what the client saw is what the database holds; a client abort cancels in-flight provider calls via the AbortSignal and keeps everything accepted so far. One run per branch at a time: a concurrent `POST` 409s (`generation-active`), with a unique `(branch_id, ordinal)` index as the database backstop. Before a run starts, a half-persisted trailing era from a crash (events but no critique report) is rolled back and regenerated, with a streamed warning. When the provider meters (live mode), a cumulative `run.usage {usage, byModel, estimatedUsd, unpricedModels}` frame follows any frame after which new provider calls landed, and `run.completed` carries the same fields as its final summary: the web cost meter reads these; dollar figures are dated estimates from `core/src/pricing.ts`, never billing truth. The mock meters nothing, so demo streams carry no `run.usage` frames. A budget-ceiling stop streams `run.error {code: "budget-exceeded"}`. In mock mode `UCHRONIA_MOCK_PACE_MS` (set by `pnpm dev:mock` to 250) holds each accepted event briefly so the ink-in is visible.

## Model routing

| Role | Default | Env override |
| --- | --- | --- |
| generation | `claude-sonnet-5` | `UCHRONIA_MODEL_GENERATION` |
| critic + cheap utility | `claude-haiku-4-5-20251001` | `UCHRONIA_MODEL_CRITIC` |

The generation model must support structured outputs - the provider sends `output_config.format` on every call (`claude-sonnet-4-6`, the previous default, does not; overriding to it would 400 in live mode).

Role → model happens inside the provider; templates declare `role`. Mock mode (`UCHRONIA_MOCK=1`, or no key present) swaps the whole app onto the deterministic `MockProvider`: seeded per request, identical inputs → identical fixtures; arbitrary PODs work (intake reads years/mechanism/region from text, including aviation-age technology and North American markers; seed generation draws period- and region-appropriate names from era-bucketed flavor banks, with seeded sentence variants and six titles per mechanism so parallel ledgers read differently). Every template in the registry has a handler, the M17 ones included (`core/src/mock/symposium.ts`, `core/src/mock/court.ts`), so symposium derivation and the court run keyless end to end. M18 rides the existing handlers rather than new templates: `mockIndexShifts` (`core/src/mock/era.ts`) walks the divergence's own theatre's dials by a few points per era, inside the validator's bound, and reads the previous value back out of the pre-rendered index summary so demo dials continue instead of resetting each era; `mockNameDrift` fires every third era against a real event in the batch, so the philology material exists without every span turning into a glossary; and the mock convergence scan (`core/src/mock/convergence.ts`) names an attractor and, when the years actually differ, says the road was not the attested one, while lateness stays the pipeline's arithmetic. CI runs exclusively in mock.

## Dial mapping (§4.4)

`core/src/dial.ts`: `dialParams(dial, explicitAxes?)` with `r = dial/100`:

| Effect | Mapping |
| --- | --- |
| (a) Prompt language | Three bands (butterfly < 34, balanced 34–66, railroad ≥ 67), each with attractor-strength wording embedding the numeric dial, injected into every generation system prompt |
| (b) Wildcard budget | `round(lerp(3 → 0.4, r) × min(1, distance/60))` per batch, plus whole axis slots past half the distance factor (see below): more wildcards for butterfly histories, none near the POD for anyone |
| (c) Convergence pressure | `r` (0–1), fed to the pressures step (M5); the attractor block is always present when anchors exist, its stance graded by band (context-only for butterfly, may-pull for balanced, should-pull for railroad), so no mid-band cliff |
| (d) Wildcard plausibility floor | `lerp(0.15 → 0.45, r)`: wildcards scoring below the floor are discarded before commit |

The **critic is dial-aware**: its system prompt embeds the same attractor language and instructs that under a low dial, surprising-but-caused outcomes are the intended product: implausible-leap weighs whether cited causes carry the outcome, never resemblance to the familiar record.

**The axes (v2/M17).** Behind the master dial sit four controls: `greatPersonWeight`, `techVolatility`, `culturalDrift` (0–100 each) and `chaosEvents` (a boolean). `deriveAxes(dial)` gives each of the three sliders `100 - dial` and turns shocks on below 50, so a butterfly history lets persons, technology, and culture swing while a railroad history pins them; `dialParams(dial, explicitAxes)` takes explicit values verbatim when the composer's flyout has set them, and the timeline persists them on `settings.axes`.

Resolved axes produce `axesLanguage`, injected into every generation system prompt alongside the attractor and voice language. It speaks only when an axis has something to say: one sentence per slider sitting at ≤33 or ≥67, plus one more when the reader has silenced shocks that the master dial would have brought (explicitly off while `deriveAxes` would have had them on). Axes sitting mid-band produce an empty string.

Two axes also widen the wildcard envelope, and they claim **whole slots** rather than fractions: a fractional boost rounds away to nothing across most of the range, and a reader who dials technology volatile has to be able to see it happen. Past half the distance factor (`min(1, distance/60) ≥ 0.5`), `techVolatility ≥ 67` adds one wildcard and `chaosEvents` adds one. Nearer the POD than that, the base budget stands whatever the axes say: P2 discipline is not negotiable.

**The relevance guard (v2/M14).** The engine answers the question asked, structurally: seed and era prompts restate the divergence and its mechanism with an explicit on-divergence mandate; the critic rubric gains an `on-divergence` dimension (generic period content with no thread of consequence back to the divergence is flaggable, with the usual bounded-retry/dispute sentencing); and a machine tripwire (`core/src/pipeline/relevance.ts`, `batchReachesPod`) checks after each era's dual review that at least one event's cause chain reaches the seed era within a generous hop bound, streaming a drift warning when none does.

## Prompt registry (§4.7)

Templates in `packages/core/src/prompts/`, one file each, `id` + semver `version` + changelog. Shared fragments (`fragments.ts`, v1.1.0): `ANTI_CLICHE_MANDATES` (P6), `SENSITIVE_HISTORY_STANCE` (§12), `HUMAN_VOICE` (the humanity mandate: chronicler's hand, banned stock phrasing, no em dashes), `HANDLE_CONVENTIONS`. The dial adds `voiceLanguage`, a prose register that frays at butterfly settings (clipped entries, asides, un-erased corrections) and steadies to a clerk's calm at railroad; every reader-facing template embeds it. Belt and suspenders: `generateStructured` scrubs any em dash out of validated output before it can reach a store (en dashes in ranges survive).

| Template | Purpose | Version | Role |
| --- | --- | --- | --- |
| `pod-interpret` | v2 intake (M14): freeform ask + retrieved anchors → primary reading, confidence, ambiguities, 2-4 real candidate mechanisms, at most one clarifying question. The composer's entry point; the highest-leverage call in the product | 1.0.0 | generation |
| `pod-normalize` | Freeform POD → normalized record + baseline context (still serves fork sub-PODs and the "Just derive" path) | 1.0.0 | utility |
| `seed-consequences` | First 0–2 years: disciplined events + entity roster + era header (on-divergence mandate: every seed event traces to the divergence) | 1.2.0 | generation |
| `critic-review` | Skeptical-historian verdicts over one draft batch (dial-calibrated; causes arrive resolved; machine mannerisms are tone violations; on-divergence drift is flaggable) | 1.3.0 | critic |
| `regenerate-event` | One bounded replacement for a flagged draft; also drives the user-facing `POST …/events/:id/regenerate` (a fresh telling in place, clone-validated) | 1.1.0 | generation |
| `derive-pressures` | 3–7 named tensions from the state snapshot (+ graded attractor pull; previous pressures must be carried or discharged; reads the coarse regional dials) | 1.3.0 | critic |
| `era-generate` | One era of consequences from snapshot + pressures + dial + distance (chain-extension mandate; entity lifecycle via `ends:true`; mechanism named, on-divergence mandate; lives, role facts, index shifts, name drift, and the epilogue register) | 1.5.0 | generation |
| `era-specialist` | Symposium stage 1 (M17): one era drafted from one chair's discipline; three run in parallel, wildcards left to the synthesizer | 1.0.0 | generation |
| `era-synthesize` | Symposium stage 2 (M17): merge the specialist drafts into one era, fold duplicate tellings, allocate wildcards, and keep what the chairs could not settle as contested refs with marginal notes | 1.0.0 | generation |
| `court-advocate` | Court of Plausibility (M17): the strongest honest case that a disputed event stands as written, from the record given | 1.0.0 | critic |
| `court-skeptic` | The strongest honest case against it: where the cited causes cannot carry the outcome | 1.0.0 | critic |
| `court-judge` | One ruling, no appeal: uphold / revise (with a concrete instruction) / dispute, plus a short opinion naming which argument carried | 1.0.0 | generation |
| `convergence-scan` | Conservative rhyme-detection against baseline anchors (theatre-aware; candidates carry their theme tags and attractor strength, high-pull anchors read as structural channels and low-pull as contingent moments; matches name their attractor and how the road differed) | 1.4.0 | critic |
| `event-expand` | Expanded narrative from state-at-event + causal neighborhood | 1.1.0 | generation |
| `era-deepdive` | Era essay over pressures and events | 1.1.0 | generation |
| `entity-biography` | In-timeline biography held to the ledger | 1.1.0 | generation |
| `artifact-newspaper` | Diegetic front page (era-appropriate masthead, columns, notices) | 1.1.0 | generation |
| `artifact-letter` | Diegetic personal letter (news arriving slantwise) | 1.1.0 | generation |
| `artifact-encyclopedia` | Entry from an in-world reference work, decades on | 1.1.0 | generation |
| `artifact-poster` | Proclamation / bill / propaganda sheet with an issuer | 1.1.0 | generation |

**Artifacts (F8):** `POST /api/branches/:b/events/:id/artifacts {kind}`: conditioned on the state *as of the event*, one document per (event, kind); asking again returns the same document (the reader deserves a stable source). All four are HTML/CSS typographic compositions client-side; no image generation.

## Baseline dataset

`packages/core/data/baseline.json`: **1578 hand-curated anchors** spanning 4000 BC → 2024 CE across every region and all five lenses (`provenance: "curated"`, dataset version 2). Shape, taxonomy, and the `scripts/build-baseline.mjs` assembler: [DATA_MODEL.md](DATA_MODEL.md). Powers the record spine (F7), intake retrieval, convergence candidates (anchors within an era-width+25y window of each era's midpoint), and the pressures step's attractor hints. `anchorsNear` ranks by **theatre before year**: same region (or global) first, adjacent regions second, the rest in the tail: an Alexandrian divergence no longer draws its attractors from Ming China, while off-region anchors still fill sparse periods. The scan prompt names each candidate's theatre, its themes, and its attractor strength, and demands the causal road for any cross-theatre match.

**Attractor hints (v2/M16).** The pressures step no longer takes the first five anchors it finds in the theatre. `runGeneration` asks `anchorsNear` for 12, sorts them by `attractorStrength`, and hands the pressures prompt the 5 strongest: within a theatre, the structural channels lead and the contingent footnotes drop out.

**Retrieval scoring** (`core/src/retrieval.ts`). `tokenize` lowercases, keeps runs of 3+ letters, and drops stopwords. `keywordScore` weighs a title hit at `3 × specificity(token)`, a summary hit at 1, a region-name hit at +2, and a **theme-tag hit at +2** (v2/M16: "plague", "trade", "war" now reach anchors whose titles say it otherwise; tags are split on their hyphens first). `scoreAnchor` adds a year bias worth up to 3 within a century, fading to nothing five centuries out. `retrieveAnchors` drops zero scores outright (an empty result is the honest answer for garbage) and sorts by score, then nearness to the hinted year, then **magnitude descending** (v2/M16: equal evidence and equal distance means the larger event leads), then id.

`Specificity` is a `(token) => number` in [1/3, 1], and there are two:

- **`lengthSpecificity`**, the v1 rule (1 for a 5+ character token, 1/3 otherwise), kept as the default so `keywordScore` stays usable without a corpus. It is genuinely bad at the job: "moon" is more specific than "program" and shorter.
- **`corpusSpecificity(anchors)`** (v2/M16), used wherever the baseline is at hand, i.e. by `retrieveAnchors` and by `sketchPod`. It measures document frequency over anchor *titles*: `idf = log((total+1)/(df+1))`, normalized against the ceiling at `DF_SPECIFIC = 4` (a word appearing in four anchor titles or fewer counts as fully specific) and clamped into [1/3, 1]. A word occurring in few titles is evidence; one occurring in hundreds is noise, and the measure sharpens as the baseline densifies rather than blunting. Pure and deterministic; the per-corpus index is memoized on the array identity in a `WeakMap`, and an empty corpus falls back to the length rule.

The **stopword list is much longer in v2** for the same reason. Under the length proxy any 5+ character word read as specific evidence, so a long function word outranked a short proper noun: "rise **against** Afrikaans" once tied "**Constantinople** falls" for the query "Constantinople held against the siege". Long prepositions, conjunctions, and auxiliaries are now dropped by name.

**Anchor snapping** (`core/src/pod-sketch.ts`) scores with `corpusSpecificity` too, and its tie-break is `beatsSnapped`: a named year decides first when the ask supplies one; otherwise the **higher magnitude wins** (v2/M16), and the later year is the last resort so the rule stays total and deterministic. Asked about a siege at Constantinople with no year, the fall of the city beats a same-scoring footnote three centuries later.

**State snapshot budgeting.** `summarizeState` ranks entities by how recently history touched them, withholds the coldest beyond a cap (default 40, with an honest count), trims each line to its most recently written facts (default 14), and collapses ended entities into a terse `no longer extant` line; late-era prompts stop growing without bound.

**Entity lifecycle.** A delta may carry `ends: true` (death, dissolution). Endedness is replay-derived and therefore branch-local for free; the roster drops the dead, the validator's `no-posthumous-mutation` rule makes them unarguable, and era-generate is told that people age. v2/M18 gives the same actors a beginning (`bornYear`), an honest label when this history invented them (`counterfactual`), a line to follow (`succeedsSlug`), and offices that open and close: a delta setting a `role` fact opens a tenure, the next role closes it, a terminal delta closes whatever is open, and `World.roleTenures` replays the lot per branch.

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

**The Court of Plausibility (v2/M17).** Opt-in per timeline (`settings.court`). After sentencing, drafts the critic is still objecting to may be argued out instead of simply marked, at most `MAX_COURT_CASES = 3` per era (cost discipline). Per case: `court-advocate` and `court-skeptic` brief **in parallel** on the critic tier, over exactly the record the critic saw (POD statement, era span, state summary, cause glossary, the draft, the critic's issues); then `court-judge` rules once on the generation tier. No loops, no appeals.

- **uphold**: the dispute is cleared and the event commits clean.
- **revise**: one `regenerate-event` retelling under the judge's instruction (falling back to the opinion when no instruction came). The retelling is resolved and machine-validated on a clone; if it is clean the retelling replaces the draft and the dispute clears, and if it breaks graph rules the original stands disputed. Either way a warning says which happened.
- **dispute**: the mark stays, with the transcript attached.

Every case that reaches a committed event leaves a `CourtRecord` (both briefs, the ruling, provenance from the judge's model), committed into the world and streamed as `court.completed`; the transcript reads on the event detail page. A case whose draft was ultimately dropped leaves no record: there is no event to bind it to.

An entirely-dropped batch raises `GenerationValidationError` (fails loudly). A convergence-scan failure after the era has committed degrades to a streamed warning (the era stands, unscanned), since aborting would strand a half-finished era for resume to skip. Disputed events flow through the normal `event.accepted` SSE frame with `flags.disputed` set: the ledger shows the mark and the critic's notes travel with the event. Contested events (the symposium's marks) travel the same way.

## Stages that are not the era loop (v2/M19-M23)

None of these touch `runGeneration`. They are single calls (or none at all) over a branch that already exists, which is why each one is cheap enough to offer as a button.

| Stage | Template | Tier | Calls | Persists |
| --- | --- | --- | --- | --- |
| Counterfactual pulse | `pulse` | generation | 1 | nothing |
| Graft | (none) | - | 0 | events, edges, one era |
| Cross-branch fates | (none) | - | 0 | nothing |
| Historiographic schools | `historiography-schools` | generation | 1 per branch, ever | schools |
| Event interpretations | `event-interpretation` | generation | 1 per event, ever | interpretations |
| Ask the archivist | `archivist-ask` | generation | 1 | nothing |
| Grand inquiry | `grand-inquiry` | generation | 1 | one `inquiry` artifact |
| Commission the book | (none) | - | 0 | nothing |

**The pulse** (`core/src/pipeline/pulse.ts`) is handed the event, the reader's flip, the state summary, the era's live pressures, and only the convergences at or after the pulsed event, since an earlier one cannot be broken by it. The prompt requires it to say when a flip changes very little: a forecast that everything changes is the same as no forecast.

**The graft** (`core/src/pipeline/graft.ts`) takes the event plus everything it directly causes on its own branch, one hop. It refuses a target that is not a leaf, a target that already sees the event, and an asked-for event whose actors the target has never met. A *consequence* whose actors it has never met simply stays behind, reported as a soft conflict. Hard rules (dates, era membership, edge endpoints, entities, deltas, posthumous mutation, fork normalization) always refuse; `era-overlap` is soft, because a branch carrying material dated inside history it already wrote is the honest picture rather than a defect. Soft conflicts come back unapplied so the reader decides; `force: true` writes the transplant marked disputed with each conflict attached as a critic note.

**The symposium and the court** are covered above. **Historiography** derives two or three schools from the branch's load-bearing events (disputed, convergent, or high-plausibility), then glosses any event through all of them in one call, because their disagreement is the point and writing them together is what makes them disagree about the same thing. Glosses match back to schools by name, falling back to position.

**Interrogation** is documented in [DATA_MODEL.md](DATA_MODEL.md#interrogation-and-findings-v2m23). Both templates are told they may reason across the record but not add to it.

## Region control (v2/M22)

`era-generate` (1.6.0) may return `regionControl` for the macro-regions an era actually moved: a holder, a grip, and a note. `recordClaims` binds them to the era's closing event like the index readings. Silence means the map stands as it was, which is why a chronicle that never discussed control renders uncoloured rather than guessed.
