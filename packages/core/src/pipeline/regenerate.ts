import type { DraftEvent, Event, StateDelta, StateFact, StateRecord } from '@uchronia/schemas'
import { GenerationValidationError, NotFoundError, PreForkImmutableError } from '../errors.js'
import { regenerateEvent } from '../prompts/regenerate-event.js'
import { validateBranch } from '../validator.js'
import { World } from '../world.js'
import { renderValue } from './context.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

function recordToFacts(record: StateRecord): StateFact[] {
  return Object.entries(record).map(([key, value]) => ({
    key,
    value:
      typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? value
        : renderValue(value),
  }))
}

/**
 * User-facing regeneration of a COMMITTED event: a fresh telling with the same
 * identity. Position, era, and causal edges stay; title, summary, lenses,
 * plausibility, and deltas are rewritten conditioned on the state as of the
 * moment before the event. The replacement is trial-validated on a clone
 * before it lands — a fresh telling must not corrupt the replay. A disputed
 * flag is cleared (regeneration is the reader's remedy); stale detail resets.
 */
export async function regenerateCommittedEvent(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  eventId: string,
  guidance?: string,
): Promise<Event> {
  const event = world.getEvent(eventId)
  if (event.branchId !== branchId) {
    throw new PreForkImmutableError(
      `branch ${branchId} cannot regenerate inherited event ${eventId}; fork first`,
    )
  }
  const visible = world.resolveEvents(branchId)
  const index = visible.findIndex((e) => e.id === eventId)
  if (index === -1) throw new NotFoundError('event visible on branch', eventId)
  const era = world.getEra(event.eraId)

  const slugById = new Map(world.resolveEntities(branchId).map((e) => [e.id, e.slug]))
  const draft: DraftEvent = {
    ref: 'd1',
    year: event.date.year,
    dateLabel: event.date.label,
    title: event.title,
    summary: event.summary,
    lenses: event.lenses,
    entitySlugs: event.entityIds
      .map((id) => slugById.get(id))
      .filter((s): s is string => s !== undefined),
    newEntities: [],
    deltas: event.deltas
      .filter((d) => slugById.has(d.entityId))
      .map((d) => ({
        entitySlug: slugById.get(d.entityId) as string,
        patch: recordToFacts(d.patch),
        note: d.note,
        ...(d.ends !== undefined ? { ends: d.ends } : {}),
      })),
    causes: [],
    plausibility: event.plausibility,
    wildcard: event.wildcard,
  }

  // Condition on the world as it stood the moment before this event (P1).
  const previous = visible[index - 1]
  const stateBefore =
    previous === undefined ? new Map<string, StateRecord>() : world.stateAt(branchId, previous.id)
  const stateLines: string[] = []
  for (const entity of world.resolveEntities(branchId)) {
    const record =
      stateBefore.get(entity.id) ?? (entity.introducedByEventId === null ? entity.initialState : null)
    if (!record) continue
    const facts = Object.entries(record)
      .map(([k, v]) => `${k}=${renderValue(v)}`)
      .join('; ')
    stateLines.push(`- ${entity.slug} (${entity.type}, "${entity.name}"): ${facts}`)
  }

  const out = await generateStructured(
    ctx.provider,
    regenerateEvent,
    {
      podStatement: world.pod.statement,
      eraTitle: era.title,
      eraSpan: `${era.startYear}–${era.endYear}`,
      stateSummary: stateLines.join('\n'),
      draft,
      issues: [
        guidance?.trim() ||
          'The reader asked for a fresh telling of this event: keep its causal role and position, change its texture, angle, and specifics.',
      ],
    },
    callOpts(ctx),
  )

  const fresh = out.value.event
  const deltas: StateDelta[] = []
  const idBySlug = new Map([...slugById].map(([id, slug]) => [slug, id]))
  for (const delta of fresh.deltas) {
    const id = idBySlug.get(delta.entitySlug)
    if (!id) continue // regeneration may not introduce entities; unknown slugs drop
    const patch: StateRecord = {}
    for (const fact of delta.patch) patch[fact.key] = fact.value
    deltas.push({
      entityId: id,
      patch,
      note: delta.note,
      ...(delta.ends !== undefined ? { ends: delta.ends } : {}),
    })
  }
  if (deltas.length === 0 && event.deltas.length > 0) {
    // Never let a regeneration strip an event of its state consequences.
    deltas.push(...event.deltas)
  }

  const withinEra = fresh.year >= era.startYear && fresh.year <= era.endYear
  const replacement: Event = {
    ...event,
    date: withinEra ? { year: fresh.year, label: fresh.dateLabel } : event.date,
    title: fresh.title,
    summary: fresh.summary,
    lenses: fresh.lenses,
    plausibility: fresh.plausibility,
    deltas,
    detail: null,
    flags: { ...event.flags, disputed: false },
    criticNotes: null,
    provenance: makeProvenance(ctx, regenerateEvent, out.model),
  }

  const clone = World.fromAggregate(world.toAggregate())
  const preexisting = new Set(validateBranch(clone, branchId).map((i) => i.message))
  clone.replaceOwnEventContent(replacement)
  const issues = validateBranch(clone, branchId).filter((i) => !preexisting.has(i.message))
  if (issues.length > 0) {
    throw new GenerationValidationError(
      'regenerate-event',
      issues.map((i) => `${i.rule}: ${i.message}`),
    )
  }

  world.replaceOwnEventContent(replacement)
  return replacement
}
