# Testing

> Skeleton (M0). Grows with each milestone; complete by M12.

## How to run

```sh
pnpm test          # vitest across all packages
pnpm typecheck     # tsc --noEmit everywhere
pnpm lint          # biome check
pnpm e2e           # playwright journey (from M10; mock mode)
```

Per package: `pnpm --filter @uchronia/<name> test` (`test:watch`, `test:coverage`).

## Mock mode

`UCHRONIA_MOCK=1` swaps in the deterministic `MockProvider` — seeded from request inputs, so identical inputs produce identical fixtures. All integration tests and CI run keyless in mock mode.

## Test matrix (§11.3 — target state)

- **schemas**: round-trips, fixture parsing.
- **core (unit)**: state store + change-log application, fork resolution across multi-level branches, every validator rule individually, dial mapping, prompt builders (snapshots), pressures derivation against MockProvider.
- **core (integration)**: full pipeline in mock, including critic-retry and disputed paths; convergence detection against a test baseline.
- **server**: route tests with injected MockProvider; SSE lifecycle including client abort.
- **web**: component tests for event card / stamp / thread geometry; one Playwright mock journey: gallery POD → events stream in → open event → fork → generate artifact → export JSON.

## CI

GitHub Actions on push/PR to main: install → biome → typecheck → vitest → build → (from M10) Playwright chromium in mock mode. No secrets in CI.
