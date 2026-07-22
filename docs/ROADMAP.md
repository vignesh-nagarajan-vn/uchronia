# Roadmap — living milestone status

Mirrors §13 of the master prompt ([MASTER_PROMPT reference](../CLAUDE.md)). Updated at every milestone with honest status. Every milestone exits with: tests green locally and in CI · docs synced (including CLAUDE.md) · this file updated · commits pushed.

| Milestone | Status | Notes |
| --- | --- | --- |
| M0 — Foundation | 🔨 in progress | Workspace, CI, docs skeletons, CLAUDE.md v1 |
| M1 — Schemas & engine store | ⬜ | |
| M2 — Persistence & API skeleton | ⬜ | |
| M3 — Generation v1 | ⬜ | |
| M4 — Critic & validation loop | ⬜ | |
| M5 — Era engine | ⬜ | |
| M6 — Lazy expansion | ⬜ | |
| M7 — Branching | ⬜ | |
| M8 — Artifacts | ⬜ | |
| M9 — Web foundation | ⬜ | |
| M10 — Web depth | ⬜ | |
| M11 — Export & polish | ⬜ | |
| M12 — Ship v0.1.0 | ⬜ | |

## Open threads

- CI includes a Playwright job from M10 onward (no e2e tests exist before then).
- `packages/core/data/baseline.json` is a 3-anchor skeleton until authored at M5.
- Push access to GitHub not yet verified from this machine (no `gh` auth); will attempt at the M0 boundary and record the outcome here.
