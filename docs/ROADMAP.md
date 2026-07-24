# Roadmap: living milestone status

Mirrors §13 of the master prompt ([MASTER_PROMPT reference](../CLAUDE.md)). Updated at every milestone with honest status. Every milestone exits with: tests green locally and in CI · docs synced (including CLAUDE.md) · this file updated · commits pushed.

| Milestone | Status | Notes |
| --- | --- | --- |
| M0: Foundation | ✅ 2026-07-22 | Workspace, CI, Vitest wired (17 tests green), docs skeletons, CLAUDE.md v1, ADR-0001 |
| M1: Schemas & engine store | ✅ 2026-07-22 | Full §3 schema set + fixture world; World store with normalized structural-sharing forks, state replay, pre-fork guards; validator v1 (8 rules, each tested); 58 tests green |
| M2: Persistence & API skeleton | ✅ 2026-07-22 | Drizzle schema + committed migrations, Repo layer, LLMProvider port + structured repair loop, deterministic MockProvider (pod intake works for arbitrary text), CRUD/import/export/branch-view routes; 81 tests green |
| M3: Generation v1 | ✅ 2026-07-22 | Seed pipeline (drafts→resolution→clone-validation→commit), dial mapping, AnthropicProvider (structured outputs via output_config.format, streaming, typed errors), SSE generate route with persist-before-stream and clean abort; mock parity incl. flavor banks; 96 tests green |
| M4: Critic & validation loop | ✅ 2026-07-22 | refineBatch dual review: clone-validated machine rules + critic rubric, bounded regeneration, drop vs dispute sentencing, wildcard plausibility floor, CritiqueReports persisted + streamed; retry/dispute/drop paths each tested |
| M5: Era engine | ✅ 2026-07-22 | Fibonacci era plan with resume-by-ordinal, pressures step (+ dial attractor pull), era-generate, convergence scan against the record; baseline.json authored (203 curated anchors); mock demo paths (revise at era 1, dispute at era 2); 106 tests green |
| M6: Lazy expansion | ✅ 2026-07-22 | Event detail (state-at-event conditioning), era deep-dives, branch-local biographies with fill-once semantics incl. shared pre-fork fills; routes + persistence; lens tagging was already first-class at generation (M3). 120 tests green |
| M7: Branching | ✅ 2026-07-22 | Fork endpoint with sub-POD normalization; child era plans from the fork year; compare endpoint (branch↔branch with shared-prefix/divergence-point, branch↔baseline); invisible-slug collision renaming in draft resolution; multi-level fork tests (grandchild) green end to end |
| M8: Artifacts | ✅ 2026-07-22 | Four diegetic generators with per-kind schemas and period-aware mock content (era-bucketed mastheads, notices, in-world encyclopedia voice); (event, kind)-stable documents; route + persistence; 133 tests green |
| M9: Web foundation | ✅ 2026-07-22 | DESIGN.md finalized first; RED THREAD tokens (Survey + Nitrate), fonts self-hosted; Atlas (composer + 12-entry catalogue + open ledgers); Timeline v1: virtualized spine, POD split, record rail, streaming ink-in; screenshot review logged in DESIGN_NOTES |
| M10: Web depth | ✅ 2026-07-22 | Event detail, dossiers, lens filters, red-thread hover layer (with honest off-screen counts), Delta tree, Compare (branch/branch + branch/record), Artifact reader (4 typographic templates), keyboard map, a11y floor (fieldsets, list fallbacks, reduced motion, AA both themes); Playwright journey green |
| M11: Export & polish | ✅ 2026-07-22 | Markdown + self-contained static HTML branch exports (design language inlined, no JS), JSON import via Settings, empty/error states, reduced-motion audit |
| M12: Ship v0.1.0 | ✅ 2026-07-22 | Demo timeline committed (demo/the-unburnt-library.uchronia.json: 67 events, 2 branches, disputes, convergences, artifacts); README with real captures; docs audit; CLAUDE.md truth pass; tag v0.1.0 |

## The 0.2 hardening series (2026-07-23)

A ~15-commit pass over the whole stack, from a full audit of v0.1.0. Highlights, all landed:

- **Engine thesis deepened**: the causal graph now feeds generation (parents in prompts, resolved causes for the critic, carried pressures); convergence is region-aware; entities have a lifecycle (terminal deltas + a ninth validator rule); the critic calibrates to the dial; forks open disciplined from their own divergence; state snapshots are recency-budgeted.
- **Corruption-proofing**: per-branch generation lock + unique `(branch_id, ordinal)` index; semantic import validation (422); partial-era healing on resume; non-fatal convergence scan.
- **Live-mode readiness**: AbortSignal to the provider's HTTP layer, one doubled-budget retry on truncation, per-run token accounting with a hard ceiling (`UCHRONIA_MAX_RUN_TOKENS`), and the provider unit-tested via an injectable client. (Still not exercised against the real API from this machine; that caveat stands.)
- **API completeness**: PATCH timeline (rename/dial/horizon-extend), regenerate-event-in-place, DELETE leaf branches, `rootBranchId` in summaries.
- **Web**: route code-splitting (the ~674 kB warning is gone), Stop button + unmount abort, search + multi-lens, prev/next walking, real j/k focus, themed burn/rename dialogs, error boundary + 404, live-region announcements, one-click showcase loading.
- **Packaging & presentation**: CI matrix (ubuntu/windows × node 22/24), Dockerfile, CHANGELOG/CONTRIBUTING/SECURITY, `pnpm dev:mock` (the POSIX-only incantation is dead), mock pacing + variety, font-embedded HTML export.

## Open threads

- Live-mode generation is wired, provider-unit-tested, and cost-capped, but still has not been exercised against the real API from this machine (no key present); mock parity is the tested path. First run with a key should start with one small timeline.
- Per user direction on 2026-07-22, M9–M12 landed as a small number of consolidated commits instead of §11.1's 5–15-per-milestone grain (process deviation, not architectural; recorded here in lieu of an ADR).
- Delta view lines run fork→horizon rather than fork→last-event (branch last-event years aren't in the compare-side payloads); honest but slightly generous.
- Deferred deliberately from the 0.2 series: user-authored events/entities (Provenance already models `kind: 'user'`), tombstone deletion of single events (dense ordinals make it structural), import-as-copy on id conflict (server-side id remapping), CompareView row virtualization, PNG/SVG export of the spine, soft-delete undo for burns, and a real sub-768px mobile layout beyond the wrap/height pass.
- Push access verified 2026-07-22 via Windows Credential Manager (`git:https://github.com`); milestone-boundary pushes are unblocked.
