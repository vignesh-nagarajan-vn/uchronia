# Generation pipeline

> Skeleton (M0). Filled in as M3–M8 land: pipeline stages, exact dial mapping, critic rubric, prompt registry.

## Stages (§4.1)

1. POD intake → normalized `PointOfDivergence` + baseline-context summary
2. Seed consequences (years ~0–2, disciplined, high-confidence)
3. Era loop: state snapshot + pressures + dial + distance → candidates → machine validator → critic → accept / regenerate (≤2) / mark disputed → commit deltas → advance
4. Convergence scan against baseline anchors
5. Lazy expanders: event detail, biographies, era deep-dive, artifacts
6. Branch fork with optional sub-POD

## Structured output

All LLM output is structured JSON validated against `packages/schemas`. The Anthropic TypeScript SDK's current mechanism is `output_config.format` (JSON-schema constrained), verified against the live docs at build time (see ADR-0001). Parse/validation failures run a bounded repair loop (max 2 re-asks with the validation errors attached), then fail the batch loudly.

## Model routing

| Role | Default | Env override |
| --- | --- | --- |
| generation | `claude-sonnet-4-6` | `UCHRONIA_MODEL_GENERATION` |
| critic + cheap utility | `claude-haiku-4-5-20251001` | `UCHRONIA_MODEL_CRITIC` |

Mock mode (`UCHRONIA_MOCK=1`) swaps the whole app onto the deterministic `MockProvider`; CI runs exclusively in mock.

## Dial mapping (§4.4)

To be documented precisely at M5 alongside the implementation.

## Critic rubric (§4.5)

To be documented at M4: anachronism · contradiction-with-state · implausible leap · teleology · great-man overreach · presentism · cliché collapse · tonal violations of the sensitive-history stance.

## Prompt registry

All templates live in `packages/core/src/prompts/`, one file per template, each with an id, a semver-style version, and a changelog comment. Registry table lands at M3 and stays in lockstep with prompt edits.
