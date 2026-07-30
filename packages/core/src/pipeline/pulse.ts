import type { EntityFate, Pulse } from '@uchronia/schemas'
import { dialParams } from '../dial.js'
import { pulse as pulseTemplate } from '../prompts/pulse.js'
import type { World } from '../world.js'
import { summarizeRecentEvents, summarizeState } from './context.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

/**
 * Branch algebra, the read-only half (v2/M19): a pulse forecasts one flip
 * without committing to it, and the fate table reports what became of one
 * entity on every branch. Neither mutates the world; the pulse is the only
 * one that costs a call.
 */

export interface PulseArgsIn {
  branchId: string
  eventId: string
  /** The reader's flip; empty means "what if this had not happened". */
  flip?: string
}

export async function pulseEvent(
  ctx: PipelineCtx,
  world: World,
  args: PulseArgsIn,
): Promise<Pulse> {
  const event = world.getEvent(args.eventId)
  const visible = world.resolveEvents(args.branchId)
  if (!visible.some((e) => e.id === args.eventId)) {
    throw new Error(`event ${args.eventId} is not visible from branch ${args.branchId}`)
  }
  const era = world.resolveEras(args.branchId).find((e) => e.id === event.eraId)
  const dial = dialParams(world.timeline.settings.dial, world.timeline.settings.axes)

  const generated = await generateStructured(
    ctx.provider,
    pulseTemplate,
    {
      podStatement: world.pod.statement,
      event: {
        year: event.date.year,
        dateLabel: event.date.label,
        title: event.title,
        summary: event.summary,
      },
      flip: args.flip ?? '',
      stateSummary: summarizeState(world, args.branchId),
      recentEvents: summarizeRecentEvents(world, args.branchId),
      pressures: (era?.pressures ?? []).map((p) => ({
        name: p.name,
        kind: p.kind,
        intensity: p.intensity,
      })),
      // Only convergences at or after the pulsed event can be broken by it.
      convergences: world
        .resolveConvergences(args.branchId)
        .filter((c) => {
          const target = visible.find((e) => e.id === c.eventId)
          return target !== undefined && target.date.year >= event.date.year
        })
        .map((c) => ({ anchorId: c.anchorId, note: c.similarityNote })),
      dial,
    },
    callOpts(ctx),
  )

  return {
    id: ctx.idgen.next(),
    branchId: args.branchId,
    eventId: args.eventId,
    flip: args.flip ?? '',
    headline: generated.value.headline,
    deltas: generated.value.deltas,
    breaks: generated.value.breaks,
    suggestedSubPod: generated.value.suggestedSubPod,
    createdAt: ctx.clock.now().toISOString(),
    provenance: makeProvenance(ctx, pulseTemplate, generated.model),
  }
}

/**
 * What became of one entity on every branch of the timeline (v2/M19). Pure
 * computation over resolved state, so it is free and always current. An
 * entity invisible on a branch is simply absent from the table rather than
 * reported as having no fate.
 */
export function entityFates(world: World, entityId: string): EntityFate[] {
  const fates: EntityFate[] = []
  for (const branch of world.allBranches()) {
    const entities = world.resolveEntities(branch.id)
    if (!entities.some((e) => e.id === entityId)) continue

    const ended = world.endedEntities(branch.id).get(entityId)
    const endedEvent = ended ? world.getEvent(ended.eventId) : undefined
    const touching = world.resolveEvents(branch.id).filter((e) => e.entityIds.includes(entityId))
    // The defining event: the one this entity is most implicated in, read as
    // the highest-plausibility event that actually changed its state.
    const changing = touching.filter((e) => e.deltas.some((d) => d.entityId === entityId))
    const defining = [...changing].sort(
      (a, b) => b.plausibility.score - a.plausibility.score || a.ordinal - b.ordinal,
    )[0]

    const state = world.stateAt(branch.id).get(entityId) ?? {}
    const standing =
      typeof state.role === 'string'
        ? state.role
        : typeof state.status === 'string'
          ? state.status
          : ended
            ? 'ended'
            : 'extant, unlabelled'

    fates.push({
      branchId: branch.id,
      branchName: branch.name,
      standing,
      ended: ended !== undefined,
      endedYear: endedEvent?.date.year ?? null,
      definingEvent: defining?.title ?? null,
      eventCount: touching.length,
    })
  }
  return fates
}
