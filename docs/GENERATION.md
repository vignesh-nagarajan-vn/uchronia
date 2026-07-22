# Generation pipeline

## Stages (§4.1)

1. **POD intake** ✅ — freeform text → normalized `PointOfDivergence` + baseline-context summary (runs inside `POST /api/timelines`)
2. Seed consequences (M3) — years ~0–2, disciplined, high-confidence
3. Era loop (M4–M5): state snapshot + pressures + dial + distance → candidates → machine validator → critic → accept / regenerate (≤2) / mark disputed → commit deltas → advance
4. Convergence scan against baseline anchors (M5)
5. Lazy expanders: event detail, biographies, era deep-dive (M6), artifacts (M8)
6. Branch fork with optional sub-POD (M7)

## Structured output

All LLM output is structured JSON validated against `packages/schemas`. Every call flows through `generateStructured` (`core/src/pipeline/structured.ts`): parse → Zod-validate → bounded repair loop (max 2 re-asks with the validation errors attached) → `GenerationValidationError`, loudly.

The live provider uses the Anthropic TypeScript SDK's current structured-output mechanism — `output_config.format` with a JSON schema (verified against the API docs at build time; ADR-0001). The LLM references world objects through short handles, never ULIDs: entity slugs, `e<n>` for accepted events, `d<n>` for its own drafts (see `HANDLE_CONVENTIONS` in `prompts/fragments.ts`).

## Model routing

| Role | Default | Env override |
| --- | --- | --- |
| generation | `claude-sonnet-4-6` | `UCHRONIA_MODEL_GENERATION` |
| critic + cheap utility | `claude-haiku-4-5-20251001` | `UCHRONIA_MODEL_CRITIC` |

Mock mode (`UCHRONIA_MOCK=1`) swaps the whole app onto the deterministic `MockProvider` — seeded per request from template id + version + seedKey, so identical inputs always produce identical fixtures. Arbitrary user PODs work in mock: intake reads years (incl. BC), mechanism, and region from the text with keyword heuristics. CI runs exclusively in mock. *(Until M3 wires `AnthropicProvider`, live mode also runs on the mock — noted in ROADMAP.)*

## Prompt registry (§4.7)

Templates live in `packages/core/src/prompts/`, one file each, `id` + semver `version` + changelog. Shared fragments (`fragments.ts`, v1.0.0): `ANTI_CLICHE_MANDATES` (P6), `SENSITIVE_HISTORY_STANCE` (§12), `HANDLE_CONVENTIONS`. This table moves in lockstep with the code:

| Template | Purpose | Version | Role |
| --- | --- | --- | --- |
| `pod-normalize` | Freeform POD → normalized record + baseline context | 1.0.0 | utility |

*(seed-consequences, derive-pressures, era-generate, critic-review, regenerate-event, convergence-scan, event-expand, entity-biography, era-deepdive, artifact-\* land at M3–M8.)*

## Dial mapping (§4.4)

Documented precisely at M5 alongside the implementation.

## Critic rubric (§4.5)

Documented at M4. Issue types (already in schemas): anachronism · contradiction-with-state · implausible-leap · teleology · great-man-overreach · presentism · cliche-collapse · tone. Verdicts: pass / revise / dispute. The critic verdicts; it never rewrites.
