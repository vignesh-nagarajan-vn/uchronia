# Testing

## How to run

```sh
pnpm test          # vitest across all packages (~174 tests)
pnpm typecheck     # tsc --noEmit everywhere
pnpm lint          # biome check
pnpm e2e           # playwright mock-mode journey (boots both servers keyless)
```

Per package: `pnpm --filter @uchronia/<name> test` (`test:watch`, `test:coverage`).

## Mock mode

`UCHRONIA_MOCK=1` (or simply no API key) swaps in the deterministic `MockProvider`, seeded per request from template id + version + seedKey, so identical inputs produce identical fixtures. Arbitrary PODs work end to end. All integration tests, the journey, and CI run keyless.

## Test matrix (§11.3, implemented)

- **schemas** (16): round-trips, fixture parsing, draft/llm shapes, artifact discrimination.
- **core unit** (now 102 with integration): seeded rng · dial mapping (bands, budgets, floors) · store: change-log replay, multi-level fork resolution, mutation guards incl. pre-fork immutability · every validator rule individually, including `no-posthumous-mutation` with its branch-locality · region-aware `anchorsNear` ranking · state-snapshot budgeting caps · structured repair loop (success/repair/fail-loud/non-JSON) · mock pod intake determinism · era planning.
- **core integration**: full pipeline in mock (seed + era loop to the horizon, determinism, resume-after-interrupt), dual-review paths (regenerate-and-fix, dispute-kept, machine-drop, wildcard floor), convergence against the real baseline, cooperative abort mid-run (committed prefix stays valid), a failing convergence scan degrading to a warning, fork discipline (a late fork's first era requests batch 4, wildcards 0, asserted via a spy provider), lazy expansion fill-once semantics, multi-level fork generation with sub-PODs.
- **server** (45): routes with the injected MockProvider: CRUD, import/export round-trip **including referential 422 rejection**, branch views through forks, SSE lifecycle including client abort mid-stream, **concurrent-run 409**, **partial-era healing on resume**, PATCH rename/dial/horizon (shrink refused), regenerate-in-place (identity kept, inherited events refused), leaf-branch deletion (roots and parents refused), expansion persistence, fork/compare, artifacts, md/html exporters, plus **AnthropicProvider unit tests** via an injectable stub client (usage mapping, truncation retry with doubled budget, refusal, abort-signal passthrough, role→model routing).
- **web** (13): year formatting · thread geometry math (sag, symmetry, caps) · EventCard/Stamp component tests (jsdom) incl. disputed/convergence marks and off-screen relation counts.
- **e2e** (Playwright, chromium): the §11.3 journey: gallery POD → SSE stream to completion → dual-review marks walked into view with `j` → open event → expand → generate artifact → read it → fork with sub-POD → child derivation → delta → export JSON download.

## Machine validator rules (each unit-tested)

dates-monotonic · event-within-era · edge-endpoints-exist · entities-exist · deltas-apply · no-posthumous-mutation · plausibility-range · era-overlap · fork-normalized (+ store-level pre-fork immutability guards).

## CI

GitHub Actions on push/PR to main: pnpm install → biome → typecheck → vitest → build web+server → Playwright chromium journey, all in mock mode, no secrets. Journey traces upload as artifacts on failure.
