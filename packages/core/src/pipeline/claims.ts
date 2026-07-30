import type { Claim, DraftIndexShift, DraftNameDrift, Era, Event } from '@uchronia/schemas'
import type { World } from '../world.js'
import { makeProvenance, type PipelineCtx } from './ctx.js'
import type { ResolvedBatch } from './drafts.js'
import type { PipelineEvent } from './events.js'

/**
 * Claim recording (v2/M18). An era's index shifts and name drifts arrive as
 * loose drafts; this binds each to a committed event so it inherits the same
 * branch visibility as everything else, computes the index delta from what
 * the branch could actually see, and drops anything that points nowhere.
 *
 * Runs after the batch commits, so `world` already holds the era's events.
 */
export function* recordClaims(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  era: Era,
  batch: ResolvedBatch,
  template: Parameters<typeof makeProvenance>[1],
  model: string,
  shifts: readonly DraftIndexShift[] = [],
  drifts: readonly DraftNameDrift[] = [],
): Generator<PipelineEvent> {
  const committed: Event[] = batch.events
  if (committed.length === 0) return
  // Index readings describe where the era LEFT a region, so they hang off its
  // closing event; a name drift names the event that moved the name.
  const closing = committed[committed.length - 1]
  if (!closing) return
  const provenance = makeProvenance(ctx, template, model)
  const before = world.regionalIndices(branchId)

  for (const shift of shifts) {
    const key = `${shift.region}|${shift.index}`
    const previous = before.get(key)?.value
    const claim: Claim = {
      id: ctx.idgen.next(),
      branchId,
      eventId: closing.id,
      year: era.endYear,
      body: {
        kind: 'regional-index',
        region: shift.region,
        index: shift.index,
        value: shift.value,
        delta: previous === undefined ? 0 : shift.value - previous,
        note: shift.note,
      },
      provenance,
    }
    world.addClaim(claim)
    yield { type: 'claim.recorded', claim }
  }

  for (const drift of drifts) {
    const eventId = batch.refToEventId.get(drift.ref)
    if (!eventId) continue
    const event = committed.find((e) => e.id === eventId)
    const claim: Claim = {
      id: ctx.idgen.next(),
      branchId,
      eventId,
      year: event?.date.year ?? era.endYear,
      body: {
        kind: 'name-drift',
        nameKind: drift.nameKind,
        attested: drift.attested,
        drifted: drift.drifted,
        note: drift.note,
      },
      provenance,
    }
    world.addClaim(claim)
    yield { type: 'claim.recorded', claim }
  }
}
