import type { Era } from '@uchronia/schemas'
import { dialParams } from '../dial.js'
import { GenerationValidationError } from '../errors.js'
import { seedConsequences } from '../prompts/seed-consequences.js'
import type { World } from '../world.js'
import { buildCritiqueReport, refineBatch } from './critic.js'
import { makeProvenance, type PipelineCtx } from './ctx.js'
import type { ResolvedBatch } from './drafts.js'
import type { PipelineEvent } from './events.js'
import { generateStructured } from './structured.js'

/** Commit a resolved batch into the world, yielding pipeline events in ink order. */
export function* commitBatch(world: World, batch: ResolvedBatch): Generator<PipelineEvent> {
  const entitiesByIntroducer = new Map<string, typeof batch.newEntities>()
  for (const entity of batch.newEntities) {
    const key = entity.introducedByEventId ?? ''
    entitiesByIntroducer.set(key, [...(entitiesByIntroducer.get(key) ?? []), entity])
  }
  const edgesByEvent = new Map<string, typeof batch.edges>()
  for (const edge of batch.edges) {
    edgesByEvent.set(edge.toEventId, [...(edgesByEvent.get(edge.toEventId) ?? []), edge])
  }

  for (const event of batch.events) {
    for (const entity of entitiesByIntroducer.get(event.id) ?? []) {
      world.addEntity(entity)
      yield { type: 'entity.created', entity }
    }
    world.addEvent(event)
    const edges = edgesByEvent.get(event.id) ?? []
    for (const edge of edges) world.addEdge(edge)
    yield { type: 'event.accepted', event, edges }
  }
}

/**
 * The generation run (§4.1): seed consequences for a fresh root branch, each
 * batch passing the dual review — machine validator + skeptical critic with
 * bounded regeneration (§P4). The era loop (stage 3) extends this at M5.
 * Mutates `world` in step with the events it yields; the caller persists.
 */
export async function* runGeneration(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
): AsyncGenerator<PipelineEvent> {
  const branch = world.getBranch(branchId)
  yield { type: 'run.started', branchId }

  const dial = dialParams(world.timeline.settings.dial)

  if (world.ownEvents(branchId).length === 0 && branch.parentBranchId === null) {
    // ---- Stage 2: seed consequences ------------------------------------
    const pod = world.pod
    const generated = await generateStructured(ctx.provider, seedConsequences, {
      pod: {
        statement: pod.statement,
        year: pod.year,
        dateLabel: pod.dateLabel,
        region: pod.region,
        mechanism: pod.mechanism,
        baselineContext: pod.baselineContext,
      },
      dial,
    })
    const provenance = makeProvenance(ctx, seedConsequences, generated.model)

    const era: Era = {
      id: ctx.idgen.next(),
      branchId,
      ordinal: 0,
      startYear: pod.year,
      endYear: pod.year + 2,
      title: generated.value.title,
      summary: generated.value.summary,
      pressures: [],
      status: 'skeleton',
      detail: null,
      provenance,
    }

    const refined = await refineBatch({
      ctx,
      world,
      branchId,
      era,
      drafts: generated.value.events,
      dial,
      provenance,
    })
    for (const warning of refined.warnings) yield { type: 'warning', message: warning }
    if (refined.batch.events.length === 0) {
      throw new GenerationValidationError(seedConsequences.id, [
        'every seed event was dropped by the dual review',
        ...refined.warnings,
      ])
    }

    world.addEra(era)
    yield { type: 'era.started', era }
    yield* commitBatch(world, refined.batch)

    const report = buildCritiqueReport(ctx, branchId, era.id, refined.verdicts, provenance)
    world.addCritique(report)
    yield { type: 'critique.completed', report }
    yield { type: 'era.completed', era }
  }

  yield { type: 'run.completed', branchId }
}
