# Testing

## How to run

```sh
pnpm test          # vitest across all packages (~189 tests)
pnpm typecheck     # tsc --noEmit everywhere
pnpm lint          # biome check
pnpm e2e           # playwright mock-mode journey (boots both servers keyless)
pnpm verify:vercel # build the serverless bundle, stage it like Vercel ships it, smoke it
```

Per package: `pnpm --filter @uchronia/<name> test` (`test:watch`, `test:coverage`).

## Demo (mock) mode

`UCHRONIA_MOCK=1` (or simply no API key) swaps in the deterministic `MockProvider` - surfaced to users as **demo mode** (v2/M13) - seeded per request from template id + version + seedKey, so identical inputs produce identical fixtures. Arbitrary PODs work end to end. All integration tests, the journey, and CI run keyless, forever (v2 ground rule).

## Test matrix (§11.3, implemented)

- **schemas** (14): round-trips, fixture parsing, draft/llm shapes, artifact discrimination.
- **core unit** (105 with integration): seeded rng · dial mapping (bands, budgets, floors) · store: change-log replay, multi-level fork resolution, mutation guards incl. pre-fork immutability · every validator rule individually, including `no-posthumous-mutation` with its branch-locality · region-aware `anchorsNear` ranking · state-snapshot budgeting caps · structured repair loop (success/repair/fail-loud/non-JSON) · mock pod intake determinism · era planning.
- **core integration**: full pipeline in mock (seed + era loop to the horizon, determinism, resume-after-interrupt), dual-review paths (regenerate-and-fix, dispute-kept, machine-drop, wildcard floor), convergence against the real baseline, cooperative abort mid-run (committed prefix stays valid), a failing convergence scan degrading to a warning, fork discipline (a late fork's first era requests batch 4, wildcards 0, asserted via a spy provider), lazy expansion fill-once semantics, multi-level fork generation with sub-PODs.
- **server** (57): routes with the injected MockProvider: CRUD, import/export round-trip **including referential 422 rejection**, branch views through forks, SSE lifecycle including client abort mid-stream, **concurrent-run 409**, **partial-era healing on resume**, PATCH rename/dial/horizon (shrink refused), regenerate-in-place (identity kept, inherited events refused), leaf-branch deletion (roots and parents refused), expansion persistence, fork/compare, artifacts, md/html exporters, **config parsing** (empty-vars-mean-unset, serverless `/tmp` redirect, host binding, the structured-outputs-capable generation default), **malformed-JSON 400 envelope**, plus **AnthropicProvider unit tests** via an injectable stub client (usage mapping, truncation retry with doubled budget, refusal, abort-signal passthrough, role→model routing).
- **web** (13): year formatting · thread geometry math (sag, symmetry, caps) · EventCard/Stamp component tests (jsdom) incl. disputed/convergence marks and off-screen relation counts.
- **e2e** (Playwright, chromium): the §11.3 journey: gallery POD → SSE stream to completion → dual-review marks walked into view with `j` → ledger search → open event → expand → generate artifact → read it → fork with sub-POD → child derivation → delta → export JSON download. Plus the ephemerality dead end: a vanished branch renders the honest explanation with a working way back to the atlas, not a retry loop. Plus demo-mode honesty (M13): the DEMO pill and composer banner are visible, the pill walks to Settings, and the live-connection check answers with the demo truth.
- **fake-Vercel smoke** (`scripts/verify-vercel.mjs`, run by `pnpm verify:vercel`): stages `api/index.mjs` + `apps/server/dist/**` exactly as Vercel ships the function, imports the bundle under plain Node with `VERCEL=1`, and asserts cold start (migrations at the staged path, bundled-ledger seeding, the native sqlite binding), a branch view, the font-embedded HTML export, and the 404 envelope.

## Machine validator rules (each unit-tested)

dates-monotonic · event-within-era · edge-endpoints-exist · entities-exist · deltas-apply · no-posthumous-mutation · plausibility-range · era-overlap · fork-normalized (+ store-level pre-fork immutability guards).

## CI

GitHub Actions on push/PR to main, all in mock mode, no secrets:

- **secrets** (ubuntu): `node scripts/check-secrets.mjs` - the tree and staged diff scanned for key material with matches redacted, and the `.env` ignore verified.
- **checks** - a 2×2 matrix (ubuntu/windows × node 22/24): pnpm install → biome → typecheck → vitest → build.
- **vercel-shape** (ubuntu, node 22): `pnpm verify:vercel` (the fake-Vercel smoke above) plus the web build and root-`dist` mirror - the exact steps `vercel.json` runs, on the OS Vercel builds on.
- **journey** (ubuntu): the Playwright chromium journey; traces upload as artifacts on failure.
