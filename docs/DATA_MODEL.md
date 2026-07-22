# Data model

Authoritative schemas live in `packages/schemas` (Zod-first; TypeScript types are inferred — never hand-written). Everything an LLM produces is validated against these schemas before it touches any store. This document explains the model; the code is the contract.

## Type inventory (§3)

| Type | File | Notes |
| --- | --- | --- |
| `Timeline` | `timeline.ts` | id, title, createdAt, settings (dial 0–100, horizonYears, defaultLenses, model config snapshot) |
| `PointOfDivergence` | `pod.ts` | raw user text kept verbatim + normalized statement, year/dateLabel, region, mechanism, baselineContext |
| `Branch` | `branch.ts` | parent pointer + fork event + optional sub-POD. Root has null parent |
| `Era` | `era.ts` | per-branch, ordinal, year range, pressures[], status skeleton/expanded, lazy `detail` |
| `Event` | `event.ts` | per-branch ordinal, date {year, label}, summary, lazy `detail`, entityIds, **deltas**, lenses, plausibility {score, rationale}, distanceFromPod, wildcard, flags {disputed, convergence}, criticNotes |
| `Entity` | `entity.ts` | slug (LLM handle), type, name, description, initialState, introducedByEventId (null = seeded) |
| `CausalEdge` | `edge.ts` | branch-owned, kind ∈ causes/enables/prevents/accelerates/delays, strength 0–1 |
| `Artifact` | `artifact.ts` | per-kind structured bodies (newspaper/letter/encyclopedia/poster), stylingHints |
| `ConvergencePoint` | `convergence.ts` | event ↔ baseline anchor + similarity note |
| `CritiqueReport` | `critique.ts` | batch verdict sheet: per-event issues + pass/revise/dispute |
| `BaselineAnchor` | `convergence.ts` | curated real-history spine entries (`packages/core/data/baseline.json`) |
| `TimelineAggregate` | `aggregate.ts` | the whole timeline as one document — hydration, export/import (F10), and fixtures share this one schema |

Draft shapes the LLM emits (no ids, no provenance) live in `llm.ts` — see `docs/GENERATION.md`.

## Dates

Years are integers; negative = BC; there is no year zero (astronomical numbering is not used). Every dated row carries a display `label` ("Spring 1454", "c. 40 BC") alongside the machine `year`.

## Derived, not stored

Two things the spec words as fields are deliberately **derived**:

1. **`Entity.state` and `Entity.changeLog`** — state is branch-dependent, so the stored entity holds only `initialState`; a branch-resolved `EntityView` (state + ledger) is computed by replaying the `StateDelta`s carried on the events visible from that branch. Single source of truth on the event ⇒ branch-local state is consistent by construction (P1) and dossiers can never disagree with the timeline.
2. **`Event.causes` / `Event.effects`** — stored on `CausalEdge` rows; the API serves `EventView` with the adjacency computed per branch. Storing arrays on events would let a child branch's edges mutate inherited (immutable) events, and would leak child causality into the parent's view.

State values are scalars or string lists — never nested JSON. Ledger lines must read like a ledger; depth belongs in prose.

## Fork semantics — structural sharing

Implemented in `packages/core/src/world.ts`.

- A branch's visible history = concatenation of **segments**: each ancestor's own events cut at the fork ordinal, then the branch's own events. Nothing is copied.
- Every event/era carries a per-branch `ordinal`; a fork at event E stores `forkEventId = E` and the cut is `E.ordinal`.
- **Normalization**: the stored `parentBranchId` is the branch that *owns* the fork event. Forking at an inherited event from a grandchild's view attaches the new branch to the owning ancestor — the visible prefix is identical either way, and the delta tree renders the fork on the owning segment regardless. The validator's `fork-normalized` rule enforces the invariant.
- **Pre-fork immutability**: structural mutations (adding events/edges into an era, disputes, convergence marks) require ownership and throw `PreForkImmutableError` otherwise. Lazy *fill-ins* (event `detail`, era deep-dives, artifacts) are allowed on inherited events — pre-fork history is the same history for every descendant, so the fill is shared and fills exactly once.
- Edges may point **from** an inherited event **to** an owned event (how post-fork history claims pre-fork causes) but never the reverse.

## Machine validator

`packages/core/src/validator.ts` — pure rules over a branch's resolved view, each independently tested (§11.3 minimum set + two extras):

`dates-monotonic` (within an era) · `event-within-era` · `edge-endpoints-exist` (incl. own-branch visibility) · `entities-exist` · `deltas-apply` (no mutation before introduction, per branch) · `plausibility-range` · `era-overlap` · `fork-normalized`. Pre-fork immutability is enforced at the store boundary (guards throw), covered by store unit tests.

## Provenance

Every row carries `provenance`: `generated` (model, templateId, templateVersion, generatedAt, mock|live), `curated` (baseline dataset, gallery), or `user` (freeform POD text, hand-typed titles). IDs are ULIDs minted through the injected `IdGen` port (`sequentialIdGen` in tests/mock for determinism).

## Baseline dataset

`packages/core/data/baseline.json` — 203 hand-curated real-history anchors (4000 BC → 2000 CE, every region, all five lenses) powering the record spine (F7), convergence detection, and high-dial attractor hints. `provenance: "curated"`, never generated.
