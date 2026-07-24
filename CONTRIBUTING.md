# Contributing

Thanks for looking under the hood. Uchronia is a small, opinionated codebase; this page is the human onboarding (agents get [CLAUDE.md](CLAUDE.md), which is the deeper architectural contract — worth reading either way).

## Setup

Node ≥ 22.12 and pnpm 11 (`corepack enable pnpm`), then:

```sh
pnpm install
pnpm dev:mock   # server :8787 + web :5173, keyless, deterministic
```

`pnpm test` / `pnpm typecheck` / `pnpm lint` / `pnpm e2e` must all pass before a PR. CI runs them keyless on Linux and Windows.

## The shape of the repo

`packages/schemas` (Zod-first contracts) ← `packages/core` (pure engine, IO only via injected ports) ← `apps/server` (Hono + SQLite) ← `apps/web` (Vite + React). Dependency arrows only point left. Everything an LLM produces is schema-validated at the boundary.

## Rules that will come up in review

- **Commits**: Conventional Commits, atomic, `type(scope): imperative subject ≤ 72 chars`.
- **Docs move with code**: any change to behavior, schemas, prompts, or commands updates `docs/` and `CLAUDE.md` in the same series. Drift is treated as a failing build.
- **Design**: all UI work is bound by [docs/DESIGN.md](docs/DESIGN.md). Two colors are semantically reserved — record blue for attested history, thread red for divergence/causality. Neither is ever decoration.
- **Prompts**: every template edit bumps its semver `version` and appends to its `changelog` array.
- **Core purity**: `packages/core` performs no IO. Providers, clocks, RNG, and id generation arrive as ports.
- **Sensitive history**: generation prompts keep a sober historiographic register; the critic treats tonal violations as failures. This is not negotiable.

## A good first contribution

`docs/ROADMAP.md` keeps an honest "open threads" list — the known gaps, sized roughly. Baseline anchors (`packages/core/data/baseline.json`) also welcome curation: under-covered regions and periods directly improve convergence detection.
