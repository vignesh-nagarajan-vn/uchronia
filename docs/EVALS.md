# Evals: how the engine's answers are measured

The v2 program's north star is *the engine answers the question asked,
provably*. This file defines the proof: the benchmark, the lanes, the
thresholds, and the standing decisions. Harness code lives in
`packages/evals`; committed reports in `docs/evals/` (scores only - never
prompts, responses, or anything secret).

## The benchmark

`packages/evals/src/bench.ts`: 31 PODs spanning the WW2 family (6, including
the headline "What if the Allies lost World War 2"), other modern, ancient,
medieval, early-modern, obscure-but-real, deliberately vague, adversarial
garbage, and non-English phrasing. Each entry carries structural
expectations: year window, acceptable regions, mechanisms, minimum candidate
count, and confidence bounds (vagueness and garbage must be confessed with
low confidence, never bluffed).

## Lanes

| Lane | Command | Costs money | Where it runs |
| --- | --- | --- | --- |
| Mock (structural) | `pnpm eval` (report: `pnpm eval:report` → `docs/evals/mock-lane.md`) | no | CI on every push, plus `pnpm test` via `bench.test.ts` |
| Live (judged) | `pnpm eval:live` | yes (budget-capped: `UCHRONIA_EVAL_BUDGET`, default 500k tokens) | local keyed machines only; refuses under CI or `UCHRONIA_MOCK` |
| Critic A/B | `pnpm eval:critic` (`--mock` = plumbing check only) | yes | local keyed machines only |

The mock lane asserts the demo engine's interpretation of every benchmark POD.
The live lane runs interpretation + seed + first era against the real API and
has a generation-tier judge score each POD 1-5 on: relevance-to-POD, era fit,
anachronism, tone, and convergence sanity; reports land in
`docs/evals/live-lane-<date>.md` + `.json`.

## Thresholds

- **The WW2 gate (release-blocking for v2.0.0):** live-lane relevance mean
  **>= 4.0** with **no POD below 3**.
- **Critic A/B decision rule:** the critic tier stays on Haiku if it catches
  **>= 80%** of seeded violations (planted anachronisms, tone violations,
  causality breaks; `packages/evals/src/critic-ab.ts`) with **< 10%** false
  flags on clean fixtures. Otherwise the critic tier is promoted to the
  generation model via `UCHRONIA_MODEL_CRITIC`. Decide with data, not vibes.

## Standing decisions and status

- **2026-07-29: critic tier = Haiku, pending measurement.** The A/B harness
  and fixtures are built; the measurement needs a real key and is deferred to
  the deployment per [ADR-0004](adr/0004-live-gates-deferred.md). Until it
  runs, the default stands because nothing has yet contradicted it.
- **2026-07-29: live lane built, not yet run** (same deferral). The mock lane
  is green (31/31) and CI-enforced; it exists so the demo engine can never
  again embarrass itself the way v1 did, and it already caught three intake
  bugs while being built (a weak-word anchor snap, a recency tie-break trap,
  and a missing Operation Sea Lion alias).

## Adding to the benchmark

Add the POD to `bench.ts` with honest expectations, run `pnpm eval` until the
demo engine earns a pass (fix the engine, not the expectation), then
`pnpm eval:report` and commit both. The bench is product surface: every alias
or heuristic added to make a POD pass makes real demo users' asks land
better.
