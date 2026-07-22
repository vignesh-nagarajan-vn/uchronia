# Generation pipeline

## Stages (§4.1)

1. **POD intake** ✅ — freeform text → normalized `PointOfDivergence` + baseline-context summary (runs inside `POST /api/timelines`)
2. **Seed consequences** ✅ — years ~0–2 after the POD: 3–5 high-confidence events (no wildcards, plausibility ≥ 0.6), founding the entity roster; `POST /api/branches/:id/generate`
3. Era loop (M4–M5): state snapshot + pressures + dial + distance → candidates → machine validator → critic → accept / regenerate (≤2) / mark disputed → commit deltas → advance
4. Convergence scan against baseline anchors (M5)
5. Lazy expanders: event detail, biographies, era deep-dive (M6), artifacts (M8)
6. Branch fork with optional sub-POD (M7)

## Structured output

All LLM output is structured JSON validated against `packages/schemas`. Every call flows through `generateStructured` (`core/src/pipeline/structured.ts`): parse → Zod-validate → bounded repair loop (max 2 re-asks with the validation errors attached) → `GenerationValidationError`, loudly.

The live `AnthropicProvider` (`apps/server/src/providers/anthropic.ts`) uses the SDK's current structured-output mechanism — `output_config.format` via `zodOutputFormat` — with streaming (`messages.stream` + `finalMessage`) so era batches stay under HTTP timeouts, SDK retry/backoff for 429/5xx, and the typed provider error taxonomy at the boundary. Because strict structured outputs require `additionalProperties: false`, LLM-facing state patches travel as `{key, value}` fact lists, folded into `StateRecord`s at draft resolution.

Handles, never ULIDs: entity **slugs**, `e<n>` = 1-based position in the branch's visible history at batch start, `d<n>` = the model's own drafts. Draft resolution (`core/src/pipeline/drafts.ts`) mints ids, resolves refs, computes `distanceFromPod`, and treats unknown references as machine-fixable (dropped with a streamed warning). Every batch is trial-applied to a **clone** of the world and machine-validated before anything commits.

## Streaming protocol (§4.8)

`POST /api/branches/:id/generate` returns SSE. Each frame's `event:` is the pipeline event type; `data:` is the JSON `PipelineEvent`:

`run.started` → (`era.started` → (`entity.created`* `event.accepted`)* `era.completed`)* → `run.completed`, with `warning` frames interleaved and `run.error {code, message}` on failure. `event.disputed`, `critique.completed` (M4) and `convergence.found` (M5) join the era cycle. Every mutation is **persisted before it is streamed** — what the client saw is what the database holds; a client abort stops at the next event boundary, keeping a consistent prefix.

## Model routing

| Role | Default | Env override |
| --- | --- | --- |
| generation | `claude-sonnet-4-6` | `UCHRONIA_MODEL_GENERATION` |
| critic + cheap utility | `claude-haiku-4-5-20251001` | `UCHRONIA_MODEL_CRITIC` |

Role → model happens inside the provider; templates declare `role`. Mock mode (`UCHRONIA_MOCK=1`, or no key present) swaps the whole app onto the deterministic `MockProvider` — seeded per request, identical inputs → identical fixtures; arbitrary PODs work (intake reads years/mechanism/region from text; seed generation draws period- and region-appropriate names from era-bucketed flavor banks). CI runs exclusively in mock.

## Dial mapping (§4.4)

`core/src/dial.ts` — `dialParams(dial)` with `r = dial/100`:

| Effect | Mapping |
| --- | --- |
| (a) Prompt language | Three bands — butterfly (< 34), balanced (34–66), railroad (> 67) — each with attractor-strength wording embedding the numeric dial, injected into every generation system prompt |
| (b) Wildcard budget | `round(lerp(3 → 0.4, r) × min(1, distance/60))` per batch — more wildcards for butterfly histories, none near the POD for anyone |
| (c) Convergence pressure | `r` (0–1), fed to the pressures step (M5) as a pull toward baseline attractors |
| (d) Wildcard plausibility floor | `lerp(0.15 → 0.45, r)` — wildcards scoring below the floor are discarded before commit |

## Prompt registry (§4.7)

Templates in `packages/core/src/prompts/`, one file each, `id` + semver `version` + changelog. Shared fragments (`fragments.ts`, v1.0.0): `ANTI_CLICHE_MANDATES` (P6), `SENSITIVE_HISTORY_STANCE` (§12), `HANDLE_CONVENTIONS`.

| Template | Purpose | Version | Role |
| --- | --- | --- | --- |
| `pod-normalize` | Freeform POD → normalized record + baseline context | 1.0.0 | utility |
| `seed-consequences` | First 0–2 years: disciplined events + entity roster + era header | 1.0.0 | generation |

*(derive-pressures, era-generate, critic-review, regenerate-event, convergence-scan, event-expand, entity-biography, era-deepdive, artifact-\* land at M4–M8.)*

## Critic rubric (§4.5)

Documented at M4. Issue types (already in schemas): anachronism · contradiction-with-state · implausible-leap · teleology · great-man-overreach · presentism · cliche-collapse · tone. Verdicts: pass / revise / dispute. The critic verdicts; it never rewrites.
