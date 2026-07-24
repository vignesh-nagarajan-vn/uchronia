# ADR-0002: Entity lifecycle via terminal deltas, not stored death

**Status**: accepted, 2026-07-23

## Context

v0.1.0 had no way to end an entity. A nation that "fell" or a person who "died" could keep receiving deltas and acting for centuries, and the machine validator could not object because death was *unrepresentable*, the very class of error the dual-review pitch promises to catch.

The obvious fix (an `endedByEventId` column on `Entity`) breaks on branches: entities are timeline-global rows, but death is branch-local. If branch A kills an entity at event X and sibling branch B (forked earlier) kills it at event Y, one stored pointer cannot serve both, and each branch would see the other's death through an event it cannot even resolve.

## Decision

Death is **state**, so it travels the way all state travels: on the event. `StateDelta` gains an optional `ends: true` flag (the terminal delta); endedness is **derived by replay** of the deltas visible on a branch, exactly like every other fact (P1).

- `World.endedEntities(branchId)` derives the ended set; nothing is ever stored.
- Validator rule 9, `no-posthumous-mutation`, reports any delta targeting an entity after its terminal delta on the same branch (further deltas *within* the ending event are legal; a death may set facts).
- `EntityView.endedByEventId` is computed per branch at view-assembly time.
- Prompts: the roster drops the dead, the snapshot lists them under a terse `no longer extant` line, and `era-generate` (v1.2.0) is instructed to end entities and reminded that people age.

`ends` is optional (`absent = not terminal`), so every pre-lifecycle export imports unchanged.

## Consequences

- Branch-locality is free: a sibling that cannot see the ending event sees the entity alive, and two branches may end the same entity differently. No cross-branch reconciliation exists because no shared state exists.
- The derivation walk is O(visible events) per call; it rides the same replay that `stateAt` already performs and is cached nowhere: acceptable at current scales, and the obvious memoization point if that changes.
- Resurrection is deliberately unmodeled. If a history needs "the movement, revived", that is a *new entity* with its own introduction; the ledger stays honest about discontinuity.
