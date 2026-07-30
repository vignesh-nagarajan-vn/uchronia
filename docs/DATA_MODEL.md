# Data model

Authoritative schemas live in `packages/schemas` (Zod-first; TypeScript types are inferred, never hand-written). Everything an LLM produces is validated against these schemas before it touches any store. This document explains the model; the code is the contract.

## Type inventory (§3)

| Type | File | Notes |
| --- | --- | --- |
| `Timeline` | `timeline.ts` | id, title, createdAt, settings (dial 0–100, optional `axes`, `derivation` standard/symposium, `court` on/off, `epilogue` on/off, horizonYears 10–6000, defaultLenses, model config snapshot) |
| `DialAxes` | `timeline.ts` | four advanced controls behind the master dial (v2/M17): greatPersonWeight, techVolatility, culturalDrift (0–100 each) and chaosEvents (boolean). Optional on settings: absent means every axis derives from the master dial |
| `PointOfDivergence` | `pod.ts` | raw user text kept verbatim + normalized statement, year/dateLabel, region, mechanism, baselineContext |
| `Branch` | `branch.ts` | parent pointer + fork event + optional sub-POD. Root has null parent |
| `Era` | `era.ts` | per-branch, ordinal, year range, pressures[], status skeleton/expanded, lazy `detail`, `speculative` (the epilogue era, v2/M18; defaults false) |
| `Event` | `event.ts` | per-branch ordinal, date {year, label}, summary, lazy `detail`, entityIds, **deltas**, lenses, plausibility {score, rationale}, distanceFromPod, wildcard, flags {disputed, convergence, contested}, criticNotes |
| `Entity` | `entity.ts` | slug (LLM handle), type, name, description, initialState, introducedByEventId (null = seeded), plus the v2/M18 lives fields `bornYear`, `counterfactual`, `succeedsSlug`. Lifecycle is replay-derived: a `StateDelta` with `ends: true` ends the entity on branches that see it; `EntityView` carries the derived `endedByEventId` and `tenures` |
| `RoleTenure` | `entity.ts` | one span during which an entity held a role (v2/M18): role, start/end year, start/end event. Derived by replay, never stored; rides `EntityView.tenures` |
| `CausalEdge` | `edge.ts` | branch-owned, kind ∈ causes/enables/prevents/accelerates/delays, strength 0–1 |
| `Artifact` | `artifact.ts` | per-kind structured bodies (newspaper/letter/encyclopedia/poster), stylingHints |
| `ConvergencePoint` | `convergence.ts` | event ↔ baseline anchor + similarity note, and (v2/M18) the explanation: `attractor` (one of six structural forces), `latenessYears`, `pathNote` |
| `Claim` | `claim.ts` | a structured assertion an era makes beyond any entity's ledger (v2/M18): id, branchId, eventId, year, provenance, and a `body` discriminated on `kind` (`regional-index` or `name-drift`) |
| `CritiqueReport` | `critique.ts` | batch verdict sheet: per-event issues + pass/revise/dispute |
| `CourtRecord` | `court.ts` | one Court of Plausibility exchange over a disputed event (v2/M17): advocate brief, skeptic brief, and the judge's ruling {outcome uphold/revise/dispute, opinion, instruction} |
| `BaselineAnchor` | `convergence.ts` | curated real-history spine entries (`packages/core/data/baseline.json`); v2 adds `regions[]`, `tags[]`, `magnitude`, `attractorStrength` |
| `TimelineAggregate` | `aggregate.ts` | the whole timeline as one document: hydration, export/import (F10), and fixtures share this one schema |

Draft shapes the LLM emits (no ids, no provenance) live in `llm.ts`; see `docs/GENERATION.md`.

## Dates

Years are integers; negative = BC; there is no year zero (astronomical numbering is not used). Every dated row carries a display `label` ("Spring 1454", "c. 40 BC") alongside the machine `year`.

## Derived, not stored

Several things the spec words as fields are deliberately **derived**:

1. **`Entity.state` and `Entity.changeLog`**: state is branch-dependent, so the stored entity holds only `initialState`; a branch-resolved `EntityView` (state + ledger) is computed by replaying the `StateDelta`s carried on the events visible from that branch. Single source of truth on the event ⇒ branch-local state is consistent by construction (P1) and dossiers can never disagree with the timeline.
2. **`Event.causes` / `Event.effects`**: stored on `CausalEdge` rows; the API serves `EventView` with the adjacency computed per branch. Storing arrays on events would let a child branch's edges mutate inherited (immutable) events, and would leak child causality into the parent's view.

State values are scalars or string lists, never nested JSON. Ledger lines must read like a ledger; depth belongs in prose.

3. **Entity endedness**: a delta may carry `ends: true` (death, dissolution). Because death is replay-derived like all state, it is branch-local for free: a sibling branch that cannot see the ending event still sees the entity alive, and two branches may each end the same entity in their own way. `TimelineSummary.rootBranchId` is likewise derived at list time so clients can open a ledger without fetching its full aggregate.
4. **Role tenures** (v2/M18): `World.roleTenures(branchId, entityId)` replays the `role` key of the deltas visible on a branch. A delta that sets a role opens a tenure and closes whatever was open; a terminal delta (`ends: true`) closes the open tenure at the ending event; a tenure still held at the end of the visible record has a null `endYear` and reads "onward". Deriving rather than storing is what keeps succession branch-local: a sibling branch that cannot see the coup still shows the old holder in office, and no write is needed to make that true. Re-stating the role that is already open does not open a second span.

## Fork semantics: structural sharing

Implemented in `packages/core/src/world.ts`.

- A branch's visible history = concatenation of **segments**: each ancestor's own events cut at the fork ordinal, then the branch's own events. Nothing is copied.
- Every event/era carries a per-branch `ordinal`; a fork at event E stores `forkEventId = E` and the cut is `E.ordinal`.
- **Normalization**: the stored `parentBranchId` is the branch that *owns* the fork event. Forking at an inherited event from a grandchild's view attaches the new branch to the owning ancestor: the visible prefix is identical either way, and the delta tree renders the fork on the owning segment regardless. The validator's `fork-normalized` rule enforces the invariant.
- **Pre-fork immutability**: structural mutations (adding events/edges into an era, disputes, convergence marks) require ownership and throw `PreForkImmutableError` otherwise. Lazy *fill-ins* (event `detail`, era deep-dives, artifacts) are allowed on inherited events: pre-fork history is the same history for every descendant, so the fill is shared and fills exactly once.
- Edges may point **from** an inherited event **to** an owned event (how post-fork history claims pre-fork causes) but never the reverse.

## Claims (v2/M18)

`packages/schemas/src/claim.ts`. A claim is a structured assertion an era makes about the world beyond any single entity's ledger. Two bodies exist so far, discriminated on `kind`:

- **`RegionalIndexClaim`**: a coarse 0–100 reading of `population` or `economicVitality` for one region of the eleven-value `ANCHOR_REGIONS` taxonomy (the M16 anchor taxonomy, reused rather than re-invented), the `delta` from the previous reading on this branch, and a `note`. Deliberately not a demographic model: it is a legible dial the pressures step can read and the validator can police, and the note is what makes a movement auditable. `MAX_INDEX_DELTA = 12` is how far one claim may move a dial without naming a reason.
- **`NameDriftClaim`**: a name this history moved. `nameKind` (toponym / personal / title / institution), the `attested` form, the `drifted` form, and a note on how it happened. Naming claims only: Uchronia glosses what things came to be called and does not invent languages to call them in.

**A claim hangs off an event, never off a branch, and that is the whole trick.** `World.addClaim` asserts the event belongs to the claiming branch, and `World.resolveClaims(branchId)` resolves through the branch's *visible events* rather than walking the branch chain, returning them in year order (id breaking ties). Resolving through the chain would give a child every claim its parent ever made, including the ones made after the fork; resolving through visible events means a fork cut mid-history inherits exactly the claims attached to the prefix it can see, by the same rule that governs events, entities, and state. Nothing extra had to be written to make that true.

`World.regionalIndices(branchId)` folds those claims into the latest reading per `region|index`, which is what the pressures step reads: the numbers in a prompt are exactly the numbers that branch can see.

`TimelineAggregate.claims` and `BranchView.claims` both default to `[]`, so a pre-M18 export re-imports unchanged. Storage is the `claims` table (body as JSON, indexed by branch and by event), added in migration `apps/server/drizzle/0004_curved_zodiak.sql`.

## Lives (v2/M18)

Entities gained three stored fields, all defaulted so older rows and exports parse unchanged:

- **`bornYear`**: birth for a person, founding for a nation, institution, or movement, first working example for a technology. Null when the record does not fix one. The end is still never stored (see endedness, above), so an entity carries its beginning and derives its ending.
- **`counterfactual`**: true for the people and bodies this history invented, who have no attested counterpart. The divergence is allowed to mint them; the reader is entitled to know which ones it minted, so the flag rides the entity rather than a hope that nobody asks.
- **`succeedsSlug`**: the entity this one follows in a line or an office, by slug; null when it opens one.

What an entity *held* is derived rather than stored: role tenures replay off the visible ledger (see "Derived, not stored", item 4) and reach the client on `EntityView.tenures`.

## Machine validator

`packages/core/src/validator.ts`: pure rules over a branch's resolved view, each independently tested (§11.3 minimum set, plus what later milestones found worth making unarguable):

`dates-monotonic` (within an era) · `event-within-era` · `edge-endpoints-exist` (incl. own-branch visibility) · `entities-exist` · `deltas-apply` (no mutation before introduction, per branch) · `no-posthumous-mutation` (nothing mutates an entity after its terminal delta, branch-locally) · `plausibility-range` · `era-overlap` · `fork-normalized` · `tech-prerequisite` (v2/M15) · `demographic-plausibility` (v2/M15) · `index-continuity` (v2/M18). Twelve rules, plus the advisory `geographic-plausibility`, which warns and never drops because event regions are only keyword-inferred. Pre-fork immutability is enforced at the store boundary (guards throw), covered by store unit tests. Imports run the whole validator before anything persists (`POST /api/import` → 422 on failure).

**Rule 12, `index-continuity`**, polices the regional dials on two counts:

1. **The arithmetic must be honest.** A claim's reported `delta` has to equal the movement from the previous reading of the same `region|index` on that branch. A claim cannot misdescribe its own step.
2. **The step must be explicable.** A move larger than `MAX_INDEX_DELTA` (12 points) needs a catastrophe or a boom named in the claim's own note, matched against a fixed vocabulary (plague, famine, war, conquest, collapse, eruption, boom, industrialization, migration, and their kin).

The size check judges the **actual** movement (the new value minus the previous reading), not the reported `delta`. That is the point of separating the two: `delta` is precisely the field an understated jump would hide in, so a claim that moves a dial thirty points while reporting two fails both counts rather than sneaking past the second. The first reading of a dial has no predecessor, so its own `delta` stands in for the movement. Claims are recorded after their era commits, so the rule is not a gate on the batch that asserted them: it reports on whole-branch validation, which is what imports and the mock-run tests exercise.

## Disputes, contests, and the court

Three separate marks, three separate origins, all carried on the event and none of them overwriting the others:

- **`flags.disputed`** is the critic's: it survived bounded retries and the event commits visibly marked, with the critic's issues in `criticNotes`.
- **`flags.contested`** (v2/M17) is the symposium's: three specialist chairs read the same development differently and the synthesizer kept both readings rather than smoothing them away. The marginal note rides `criticNotes` as an issue of type `contested`, severity `note`, so a reader finds it where the other notes live. `contested` is both a `CritiqueIssueType` and an `Event.flags` member; it defaults to `false`, so pre-M17 rows and exports parse unchanged.
- **`CourtRecord`** (v2/M17) is the court's, and it is a separate row rather than a flag: an event can be tried at most once, the transcript binds to the committed event id, and a case whose draft was ultimately dropped leaves no record at all. Records are branch-owned like everything else; `courtRecordsFor(branchId)` returns the ones visible on a branch (its own and its ancestors'), and `addCourtRecord` asserts the event belongs to the branch. `TimelineAggregate.courtRecords` defaults to `[]` so a pre-court export re-imports unchanged.

## Provenance

Every row carries `provenance`: `generated` (model, templateId, templateVersion, generatedAt, mock|live), `curated` (baseline dataset, gallery), or `user` (freeform POD text, hand-typed titles). IDs are ULIDs minted through the injected `IdGen` port (`sequentialIdGen` in tests/mock for determinism).

## Baseline dataset

`packages/core/data/baseline.json`: **1578 hand-curated real-history anchors** (4000 BC → 2024 CE, 54 centuries represented, 367 anchors in the twentieth century alone, every region) powering the record spine (F7), intake retrieval, convergence detection, and high-dial attractor hints. `provenance: "curated"`, never generated. The anchors speak in the original five lenses only: `philology` (v2/M18) describes drift a divergence produced, and the attested record has none.

The dataset is at `version: 2` (v2/M16). Beyond the v1 `id/year/title/summary/region/lenses`, every anchor now carries:

- **`regions[]`**: every theatre the event genuinely reaches, primary first, 1–3 of them, drawn from the fixed eleven-value `ANCHOR_REGIONS` taxonomy (Mediterranean, Europe, Middle East, Africa, East Asia, South Asia, Southeast Asia, North America, South America, Oceania, the wider world). The singular `region` stays a plain string for v1 compatibility and for `anchorsNear`'s theatre ranking.
- **`tags[]`**: 1–6 kebab-case themes ("war", "plague", "trade"). Retrieval scores them directly and the record room filters on them.
- **`magnitude`**: integer 1 (notable, local) to 5 (civilizational). Breaks ties in retrieval and in anchor snapping.
- **`attractorStrength`**: 0–1, how strongly a divergent history still gets pulled back toward this. The convergence scan and the pressures step both read it.

**Assembly.** Anchors are authored in batch files and merged by `scripts/build-baseline.mjs`:

```sh
node scripts/build-baseline.mjs <batch1.json> [batch2.json ...]
```

It refuses to write anything unless every anchor in every batch passes: id matching `bl-kebab-case`; an integer year in [-4000, 2100] and never zero; title 1–90 characters; summary 20–260 characters; `region` in the taxonomy; `regions` 1–3 long, all in the taxonomy, and starting with the primary region; `lenses` 1–3 from the five-lens vocabulary; `tags` 1–6 lowercase kebab-case; `magnitude` an integer 1–5; `attractorStrength` a number in [0, 1]; no em dash in any string field; ids unique across all batches; and title+year unique across all batches. It then sorts by year (id breaking ties), writes the dataset with its `version: 2` header, and prints the histograms the coverage quotas are judged against: anchors per region, the 20th-century count, and any century holding fewer than two anchors (flagged `THIN`). Violations print (capped at 60) and exit nonzero with nothing written. The assembler is a fast gate, not the authority: `BaselineDataset.parse` in `packages/schemas` remains the contract, enforced at test time.
