import type { ConvergencePoint, Era } from '@uchronia/schemas'
import { anchorsNear } from '../baseline.js'
import { dialParams } from '../dial.js'
import { GenerationValidationError } from '../errors.js'
import { convergenceScan } from '../prompts/convergence-scan.js'
import { derivePressures } from '../prompts/derive-pressures.js'
import { eraGenerate } from '../prompts/era-generate.js'
import { seedConsequences } from '../prompts/seed-consequences.js'
import type { World } from '../world.js'
import { summarizeRecentEvents, summarizeState } from './context.js'
import { buildCritiqueReport, type RefinedBatch, refineBatch } from './critic.js'
import { makeProvenance, type PipelineCtx } from './ctx.js'
import type { PipelineEvent } from './events.js'
import { eraBatchSize, planEraSpans } from './plan.js'
import { generateStructured } from './structured.js'

/** Commit a resolved batch into the world, yielding pipeline events in ink order. */
export function* commitBatch(world: World, batch: RefinedBatch['batch']): Generator<PipelineEvent> {
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

/** The year a branch's own generation starts from: POD for roots, fork for children. */
export function branchOriginYear(world: World, branchId: string): number {
  const branch = world.getBranch(branchId)
  if (branch.parentBranchId === null || branch.forkEventId === null) return world.pod.year
  return world.getEvent(branch.forkEventId).date.year
}

/**
 * The generation run (§4.1): seed consequences for a fresh root, then the era
 * loop — pressures → era batch → dual review → commit → convergence scan —
 * until the timeline's horizon. Era ordinals index into a fixed plan, so an
 * interrupted run resumes at the next unwritten era. Mutates `world` in step
 * with the events it yields; the caller persists.
 */
export async function* runGeneration(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
): AsyncGenerator<PipelineEvent> {
  const branch = world.getBranch(branchId)
  yield { type: 'run.started', branchId }

  const settings = world.timeline.settings
  const dial = dialParams(settings.dial)
  const pod = world.pod
  const isRoot = branch.parentBranchId === null
  const originYear = branchOriginYear(world, branchId)
  const horizonEnd = pod.year + settings.horizonYears
  const plan = planEraSpans(originYear, horizonEnd)

  // ---- Stage 2: seed consequences (fresh roots only) ---------------------
  if (isRoot && world.ownEvents(branchId).length === 0 && world.ownEras(branchId).length === 0) {
    const seedSpan = plan[0]
    if (!seedSpan) {
      yield { type: 'run.completed', branchId }
      return
    }
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
      startYear: seedSpan.startYear,
      endYear: seedSpan.endYear,
      title: generated.value.title,
      summary: generated.value.summary,
      pressures: [],
      status: 'skeleton',
      detail: null,
      provenance,
    }
    yield* runReviewedEra(ctx, world, branchId, era, generated.value.events, dial, provenance)
  }

  // ---- Stage 3: the era loop ---------------------------------------------
  const startIndex = Math.max(isRoot ? 1 : 0, world.ownEras(branchId).length)
  for (let i = startIndex; i < plan.length; i++) {
    const span = plan[i]
    if (!span) break
    const distance = Math.max(0, span.startYear - pod.year)
    const midYear = Math.round((span.startYear + span.endYear) / 2)
    const halfWidth = Math.ceil((span.endYear - span.startYear) / 2)
    const stateSummary = summarizeState(world, branchId)
    const recentEvents = summarizeRecentEvents(world, branchId)

    // §4.3 pressures, with the dial's convergence-pressure term (§4.4c).
    // Attractors come from the POD's own theatre first — a distant region's
    // record is not a channel this history can rhyme into.
    const attractorHints = anchorsNear(midYear, halfWidth + 30, {
      region: pod.region,
      limit: 5,
    }).map((a) => a.title)
    const pressuresOut = await generateStructured(ctx.provider, derivePressures, {
      podStatement: pod.statement,
      stateSummary,
      recentEvents,
      nextSpan: span,
      distanceYears: distance,
      dial,
      attractorHints,
    })

    const batchSize = eraBatchSize(distance)
    const eraOut = await generateStructured(ctx.provider, eraGenerate, {
      podStatement: pod.statement,
      span,
      ordinal: i,
      distanceYears: distance,
      pressures: pressuresOut.value.pressures,
      stateSummary,
      recentEvents,
      entityRoster: world
        .resolveEntities(branchId)
        .map((e) => ({ slug: e.slug, name: e.name, type: e.type })),
      batchSize,
      wildcardBudget: dial.wildcardBudget(distance),
      dial,
      subPodStatement: branch.subPod?.statement ?? null,
    })
    const provenance = makeProvenance(ctx, eraGenerate, eraOut.model)

    const era: Era = {
      id: ctx.idgen.next(),
      branchId,
      ordinal: i,
      startYear: span.startYear,
      endYear: span.endYear,
      title: eraOut.value.title,
      summary: eraOut.value.summary,
      pressures: pressuresOut.value.pressures,
      status: 'skeleton',
      detail: null,
      provenance,
    }
    yield* runReviewedEra(ctx, world, branchId, era, eraOut.value.events, dial, provenance)
  }

  yield { type: 'run.completed', branchId }
}

/** Dual review → commit → critique report → convergence scan, for one era. */
async function* runReviewedEra(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  era: Era,
  drafts: Parameters<typeof refineBatch>[0]['drafts'],
  dial: ReturnType<typeof dialParams>,
  provenance: ReturnType<typeof makeProvenance>,
): AsyncGenerator<PipelineEvent> {
  const refined = await refineBatch({ ctx, world, branchId, era, drafts, dial, provenance })
  for (const warning of refined.warnings) yield { type: 'warning', message: warning }
  if (refined.batch.events.length === 0) {
    throw new GenerationValidationError(era.title, [
      `every event of era "${era.title}" was dropped by the dual review`,
      ...refined.warnings,
    ])
  }

  world.addEra(era)
  yield { type: 'era.started', era }
  yield* commitBatch(world, refined.batch)

  const report = buildCritiqueReport(ctx, branchId, era.id, refined.verdicts, provenance)
  world.addCritique(report)
  yield { type: 'critique.completed', report }

  // ---- Stage 4: convergence scan (§P3) -----------------------------------
  const midYear = Math.round((era.startYear + era.endYear) / 2)
  const halfWidth = Math.ceil((era.endYear - era.startYear) / 2)
  const candidates = anchorsNear(midYear, halfWidth + 25, {
    region: world.pod.region,
    limit: 8,
  })
  if (candidates.length > 0) {
    const idToRef = new Map([...refined.batch.refToEventId].map(([ref, id]) => [id, ref]))
    const scan = await generateStructured(ctx.provider, convergenceScan, {
      podStatement: world.pod.statement,
      region: world.pod.region,
      events: refined.batch.events.map((e) => ({
        ref: idToRef.get(e.id) ?? 'd0',
        year: e.date.year,
        title: e.title,
        summary: e.summary,
      })),
      candidates,
    })
    const candidateIds = new Set(candidates.map((c) => c.id))
    for (const match of scan.value.matches) {
      const eventId = refined.batch.refToEventId.get(match.ref)
      if (!eventId || !candidateIds.has(match.anchorId)) {
        yield {
          type: 'warning',
          message: `convergence match ignored (${match.ref} → ${match.anchorId})`,
        }
        continue
      }
      const point: ConvergencePoint = {
        id: ctx.idgen.next(),
        branchId,
        eventId,
        anchorId: match.anchorId,
        similarityNote: match.similarityNote,
        provenance: makeProvenance(ctx, convergenceScan, scan.model),
      }
      world.addConvergence(point)
      world.markConvergence(branchId, eventId)
      yield { type: 'convergence.found', point, eventId }
    }
  }

  yield { type: 'era.completed', era }
}
