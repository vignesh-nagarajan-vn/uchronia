# Roadmap — living milestone status

Mirrors §13 of the master prompt ([MASTER_PROMPT reference](../CLAUDE.md)). Updated at every milestone with honest status. Every milestone exits with: tests green locally and in CI · docs synced (including CLAUDE.md) · this file updated · commits pushed.

| Milestone | Status | Notes |
| --- | --- | --- |
| M0 — Foundation | ✅ 2026-07-22 | Workspace, CI, Vitest wired (17 tests green), docs skeletons, CLAUDE.md v1, ADR-0001 |
| M1 — Schemas & engine store | ✅ 2026-07-22 | Full §3 schema set + fixture world; World store with normalized structural-sharing forks, state replay, pre-fork guards; validator v1 (8 rules, each tested); 58 tests green |
| M2 — Persistence & API skeleton | ✅ 2026-07-22 | Drizzle schema + committed migrations, Repo layer, LLMProvider port + structured repair loop, deterministic MockProvider (pod intake works for arbitrary text), CRUD/import/export/branch-view routes; 81 tests green |
| M3 — Generation v1 | ✅ 2026-07-22 | Seed pipeline (drafts→resolution→clone-validation→commit), dial mapping, AnthropicProvider (structured outputs via output_config.format, streaming, typed errors), SSE generate route with persist-before-stream and clean abort; mock parity incl. flavor banks; 96 tests green |
| M4 — Critic & validation loop | ✅ 2026-07-22 | refineBatch dual review: clone-validated machine rules + critic rubric, bounded regeneration, drop vs dispute sentencing, wildcard plausibility floor, CritiqueReports persisted + streamed; retry/dispute/drop paths each tested |
| M5 — Era engine | ⬜ | |
| M6 — Lazy expansion | ⬜ | |
| M7 — Branching | ⬜ | |
| M8 — Artifacts | ⬜ | |
| M9 — Web foundation | ⬜ | |
| M10 — Web depth | ⬜ | |
| M11 — Export & polish | ⬜ | |
| M12 — Ship v0.1.0 | ⬜ | |

## Open threads

- Live-mode generation is wired but has not been exercised against the real API from this machine (no key present); mock parity is the tested path. First run with a key should start with one small timeline.
- Concurrent generation runs on the same branch are not locked against each other (single-user local app); doc'd here rather than engineered around.
- CI includes a Playwright job from M10 onward (no e2e tests exist before then).
- `packages/core/data/baseline.json` is a 3-anchor skeleton until authored at M5.
- Push access verified 2026-07-22 via Windows Credential Manager (`git:https://github.com`); milestone-boundary pushes are unblocked.
