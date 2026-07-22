# Data model

> Skeleton (M0). Authoritative schemas live in `packages/schemas` (Zod-first; types are inferred). This document explains them. Complete by M12; core types land at M1.

## Core types (§3 of the master prompt)

`Timeline` · `PointOfDivergence` · `Branch` · `Era` · `Event` · `Entity` · `CausalEdge` · `Artifact` · `ConvergencePoint` · `CritiqueReport`

## Cross-cutting rules

- **Provenance** on every generated row: model id, prompt template id + version, timestamp, mock-or-live. Curated data (the baseline dataset) is marked `provenance: curated`.
- **IDs**: ULIDs, minted through the injected `IdGen` port.
- **Fork semantics — structural sharing.** A fork never copies history. `Branch` stores a parent pointer and fork event; reading a branch's timeline walks the parent chain up to each fork point. Pre-fork events are immutable from the child's perspective. (Implementation lands at M1; documented in detail then.)
- **State ledger.** Events carry `StateDelta`s; an entity's `changeLog` and any point-in-time state snapshot are *derived* by replaying the deltas of the events visible on a branch. Single source of truth on the event keeps branch-local state consistent by construction.

## Baseline dataset

`packages/core/data/baseline.json` — ~200 curated real-history anchor events (authored at M5) powering the real-history spine and convergence detection. Curated context, not generated content.
