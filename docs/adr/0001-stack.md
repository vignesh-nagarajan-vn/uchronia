# ADR-0001: Stack

- **Status**: accepted
- **Date**: 2026-07-22

## Context

Uchronia needs a monorepo with a pure, heavily tested engine, a thin server owning secrets and persistence, and a visually distinctive web client. The master prompt (§6) is decisive about the stack; this ADR records it plus the concrete choices it left open.

## Decision

As specified in §6: pnpm workspaces · TypeScript strict everywhere, no `any` · `packages/schemas` (Zod-first) · `packages/core` (pure engine, IO via injected ports) · `apps/server` (Hono + Drizzle + better-sqlite3, sole holder of `ANTHROPIC_API_KEY`) · `apps/web` (Vite, React, TanStack Query/Virtual, D3, Motion, React Aria Components, Tailwind v4 as token engine) · Biome · Vitest · Playwright · GitHub Actions. Explicitly out: Next.js, Redux, CSS-in-JS runtimes, component kits, image-generation APIs.

Choices the spec left open, resolved here:

1. **Node**: `engines >= 22.12` at the time of this record (raised to `>= 22.13` in the deployment-hardening pass - pnpm 11.16's own engine floor). CI pins Node 22 (the spec's LTS); local development on Node 24 is supported and exercised.
2. **Zod v4**: current major; native `z.toJSONSchema` is useful for structured-output plumbing.
3. **Source exports**: internal packages export TypeScript source directly (`"exports": "./src/index.ts"`). Vitest, tsx, Vite, and esbuild all consume TS source; no build orchestration or project references needed. "Build" per package is `tsc --noEmit` (types are the artifact) except the deployable apps: web bundles via Vite, server bundles via esbuild (`better-sqlite3` external, a native module).
4. **ULIDs** via the `ulid` package, wrapped behind an injected `IdGen` port so tests and mock mode can use deterministic factories.
5. **Routing** in the web app via `react-router` in plain library mode (not the framework). Ephemeral UI state lives in React state/context; Zustand stays out unless a real need appears (per §6).
6. **Fonts self-hosted** via `@fontsource/*` (IM Fell English, Spectral, IBM Plex Mono): no external font CDN, works offline, CSP-clean.
7. **pnpm ≥ 10 build allowlist**: `allowBuilds: { esbuild: true, better-sqlite3: false }` in `pnpm-workspace.yaml`, since pnpm blocks postinstall scripts by default: esbuild needs its install script; better-sqlite3 v13 ships prebuilt N-API binaries, so its implicit node-gyp rebuild is deliberately suppressed. (This ADR originally documented the older `onlyBuiltDependencies` key; the file is the authority.)
8. **Anthropic structured outputs**: the SDK's current mechanism is `output_config.format` (JSON schema), verified against the API docs at build time; model IDs `claude-sonnet-4-6` (generation) and `claude-haiku-4-5-20251001` (critic) confirmed active. Both are configuration (`UCHRONIA_MODEL_*`), not constants.

## Consequences

- No compiled artifacts for internal packages: simpler dev loop, but anything consuming `@uchronia/core` must be able to transpile TS (all our consumers can).
- Node 24 locally / 22 in CI gives incidental cross-version coverage.
- If better-sqlite3's native binding ever fails to install on a target platform, the recorded fallback is `@libsql/client` + `drizzle-orm/libsql` (would be a new ADR).
