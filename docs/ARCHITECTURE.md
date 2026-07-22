# Architecture

> Skeleton (M0). Sections fill in as the milestones land; this file is complete by M12.

## System map

Four workspaces, one direction of dependency:

```
apps/web ──▶ apps/server ──▶ packages/core ──▶ packages/schemas
   │              │                │
   └──────────────┴────────────────┴──▶ packages/schemas (shared types)
```

- **packages/schemas** — Zod schemas, inferred TypeScript types, fixtures. Zero runtime deps beyond zod. Everything an LLM produces is validated against these before it touches any store.
- **packages/core** — the pure engine: world-state store, fork resolution with structural sharing, machine validator, pressures, pipeline orchestration, prompt registry, `LLMProvider` port, `MockProvider`, curated baseline dataset. No IO except through injected ports (provider, persistence, clock, rng, id generation).
- **apps/server** — Hono on Node. Routes, SSE streaming, `AnthropicProvider`, persistence via Drizzle + better-sqlite3. `ANTHROPIC_API_KEY` lives here and only here.
- **apps/web** — Vite + React. The RED THREAD interface (see `DESIGN.md`).

## Ports (to be detailed at M1–M3)

- `LLMProvider` — structured completion; implementations: `AnthropicProvider` (server), `MockProvider` (core).
- `Clock`, `Rng`, `IdGen` — injected determinism.
- Persistence — the server hydrates core's in-memory store from SQLite, runs pipeline steps, and persists the mutation stream the pipeline emits.

## Data flow (generation)

1. Client `POST`s a generation request; server opens an SSE stream.
2. Server hydrates the branch's world state from SQLite into core's store.
3. Core's pipeline runs (POD intake → seed → era loop → convergence scan), yielding typed pipeline events.
4. Server persists each mutation event and forwards it down the SSE stream.
5. Client inks events into the timeline as they arrive.

Details land with M2 (persistence), M3 (pipeline v1), M4–M5 (critic, era engine).
