import type { EntityBiography, Era, Event } from '@uchronia/schemas'
import { NotFoundError } from '../errors.js'
import { entityBiography, eraDeepDive, eventExpand } from '../prompts/expanders.js'
import type { World } from '../world.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

/**
 * Lazy expanders (§4.1 stage 5, P5): depth on demand, conditioned on the
 * branch-local state at that point in time. All three fill exactly once —
 * a second request returns the stored text.
 */

export async function expandEvent(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  eventId: string,
): Promise<Event> {
  const event = world.getEvent(eventId)
  if (event.detail !== null) return event
  const visible = world.resolveEvents(branchId)
  if (!visible.some((e) => e.id === eventId)) {
    throw new NotFoundError('event visible on branch', eventId)
  }

  const edges = world.resolveEdges(branchId)
  const byId = new Map(visible.map((e) => [e.id, e]))
  const describe = (id: string) => {
    const e = byId.get(id)
    return e ? `${e.title} (${e.date.label}): ${e.summary}` : null
  }
  const causeSummaries = edges
    .filter((e) => e.toEventId === eventId)
    .map((e) => describe(e.fromEventId))
    .filter((s): s is string => s !== null)
  const effectSummaries = edges
    .filter((e) => e.fromEventId === eventId)
    .map((e) => describe(e.toEventId))
    .filter((s): s is string => s !== null)

  // The snapshot *as of this event* — not the branch's present (P1/P5).
  const stateLines: string[] = []
  const stateAtEvent = world.stateAt(branchId, eventId)
  for (const entity of world.resolveEntities(branchId)) {
    const record = stateAtEvent.get(entity.id)
    if (!record) continue
    const facts = Object.entries(record)
      .map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}`)
      .join('; ')
    stateLines.push(`- ${entity.slug} (${entity.type}, "${entity.name}"): ${facts}`)
  }

  const generated = await generateStructured(ctx.provider, eventExpand, {
    podStatement: world.pod.statement,
    event: {
      title: event.title,
      summary: event.summary,
      dateLabel: event.date.label,
      year: event.date.year,
      lenses: event.lenses,
    },
    stateSummary: stateLines.join('\n'),
    causeSummaries,
    effectSummaries,
  }, callOpts(ctx))
  return world.setEventDetail(eventId, generated.value.detail)
}

export async function expandEra(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  eraId: string,
): Promise<Era> {
  const era = world.getEra(eraId)
  if (era.detail !== null) return era
  if (!world.resolveEras(branchId).some((e) => e.id === eraId)) {
    throw new NotFoundError('era visible on branch', eraId)
  }

  const eventLines = world
    .resolveEvents(branchId)
    .filter((e) => e.eraId === eraId)
    .map((e) => `${e.title} (${e.date.label}) — ${e.summary}`)

  const generated = await generateStructured(ctx.provider, eraDeepDive, {
    podStatement: world.pod.statement,
    era: {
      title: era.title,
      summary: era.summary,
      startYear: era.startYear,
      endYear: era.endYear,
    },
    pressureLines: era.pressures.map(
      (p) => `${p.name} (${p.kind}, ${p.intensity}): ${p.description}`,
    ),
    eventLines,
  }, callOpts(ctx))
  return world.setEraDetail(eraId, generated.value.detail)
}

export async function writeBiography(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  entityId: string,
): Promise<EntityBiography> {
  const existing = world.biography(branchId, entityId)
  if (existing) return existing
  const entity = world.getEntity(entityId)
  if (!world.resolveEntities(branchId).some((e) => e.id === entityId)) {
    throw new NotFoundError('entity visible on branch', entityId)
  }

  const state = world.stateAt(branchId).get(entityId) ?? entity.initialState
  const stateLine = Object.entries(state)
    .map(([k, v]) => `${k}=${Array.isArray(v) ? `[${v.join(', ')}]` : String(v)}`)
    .join('; ')
  const ledgerLines = world
    .changeLog(branchId, entityId)
    .map((line) => `${line.dateLabel}: ${line.note}`)
  const relatedEvents = world
    .resolveEvents(branchId)
    .filter((e) => e.entityIds.includes(entityId))
    .map((e) => `${e.title} (${e.date.label})`)

  const generated = await generateStructured(ctx.provider, entityBiography, {
    podStatement: world.pod.statement,
    entity: { name: entity.name, type: entity.type, description: entity.description },
    stateLine,
    ledgerLines,
    relatedEvents,
  }, callOpts(ctx))
  return world.setBiography({
    id: ctx.idgen.next(),
    entityId,
    branchId,
    biography: generated.value.biography,
    provenance: makeProvenance(ctx, entityBiography, generated.model),
  })
}
