import type {
  ConvergencePoint,
  ConvergenceScanOut,
  DraftEvent,
  DraftIndexShift,
  DraftNameDrift,
  DraftRegionControl,
  Era,
} from '@uchronia/schemas'
import { anchorsNear } from '../baseline.js'
import { dialParams } from '../dial.js'
import { GenerationAbortedError, GenerationValidationError } from '../errors.js'
import { convergenceScan } from '../prompts/convergence-scan.js'
import { derivePressures } from '../prompts/derive-pressures.js'
import { eraGenerate } from '../prompts/era-generate.js'
import { seedConsequences } from '../prompts/seed-consequences.js'
import { eraSynthesize } from '../prompts/symposium.js'
import { geographicAdvisories } from '../validator.js'
import type { World } from '../world.js'
import { recordClaims } from './claims.js'
import { summarizeIndices, summarizeRecentEvents, summarizeState } from './context.js'
import { buildCritiqueReport, type RefinedBatch, refineBatch } from './critic.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import type { PipelineEvent } from './events.js'
import { EPILOGUE_YEARS, eraBatchSize, planEraSpans } from './plan.js'
import { batchReachesPod } from './relevance.js'
import { type GeneratedValue, generateStructured } from './structured.js'
import { deriveEraBySymposium } from './symposium.js'

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
 * loop - pressures → era batch → dual review → commit → convergence scan -
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
  const dial = dialParams(settings.dial, settings.axes)
  const pod = world.pod
  const isRoot = branch.parentBranchId === null
  const originYear = branchOriginYear(world, branchId)
  const horizonEnd = pod.year + settings.horizonYears
  const plan = planEraSpans(originYear, horizonEnd)
  // The epilogue (v2/M18): one era past the horizon, openly a guess. It rides
  // the same plan so resume still works by ordinal, and carries `speculative`
  // so every surface that renders it can say what it is.
  const epilogueIndex = settings.epilogue ? plan.length : -1
  if (settings.epilogue && plan.length > 0) {
    plan.push({ startYear: horizonEnd, endYear: horizonEnd + EPILOGUE_YEARS })
  }

  // ---- Stage 2: seed consequences (fresh roots only) ---------------------
  if (isRoot && world.ownEvents(branchId).length === 0 && world.ownEras(branchId).length === 0) {
    const seedSpan = plan[0]
    if (!seedSpan) {
      yield { type: 'run.completed', branchId }
      return
    }
    const generated = await generateStructured(
      ctx.provider,
      seedConsequences,
      {
        pod: {
          statement: pod.statement,
          year: pod.year,
          dateLabel: pod.dateLabel,
          region: pod.region,
          mechanism: pod.mechanism,
          baselineContext: pod.baselineContext,
        },
        dial,
      },
      callOpts(ctx),
    )
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
      speculative: false,
      provenance,
    }
    yield* runReviewedEra(ctx, world, branchId, era, generated.value.events, dial, provenance)
  }

  // ---- Stage 3: the era loop ---------------------------------------------
  const startIndex = Math.max(isRoot ? 1 : 0, world.ownEras(branchId).length)
  for (let i = startIndex; i < plan.length; i++) {
    if (ctx.signal?.aborted) throw new GenerationAbortedError()
    const span = plan[i]
    if (!span) break
    // P2 discipline is measured from this branch's OWN divergence - a child
    // forked a century downstream opens as tightly as a fresh root would.
    const distance = Math.max(0, span.startYear - originYear)
    const podDistance = Math.max(0, span.startYear - pod.year)
    const midYear = Math.round((span.startYear + span.endYear) / 2)
    const halfWidth = Math.ceil((span.endYear - span.startYear) / 2)
    const stateSummary = summarizeState(world, branchId)
    const recentEvents = summarizeRecentEvents(world, branchId)
    const previousPressures = world.ownEras(branchId)[i - 1]?.pressures ?? []
    const indexSummary = summarizeIndices(world, branchId)

    // §4.3 pressures, with the dial's convergence-pressure term (§4.4c).
    // Attractors come from the POD's own theatre first - a distant region's
    // record is not a channel this history can rhyme into. Within the theatre,
    // the strongest structural attractors lead (v2/M16: attractorStrength).
    const attractorHints = anchorsNear(midYear, halfWidth + 30, {
      region: pod.region,
      limit: 12,
    })
      .sort((a, b) => b.attractorStrength - a.attractorStrength)
      .slice(0, 5)
      .map((a) => a.title)
    const pressuresOut = await generateStructured(
      ctx.provider,
      derivePressures,
      {
        podStatement: pod.statement,
        stateSummary,
        recentEvents,
        nextSpan: span,
        distanceYears: podDistance,
        dial,
        attractorHints,
        previousPressures,
        indexSummary,
      },
      callOpts(ctx),
    )

    const batchSize = eraBatchSize(distance)
    const eraArgs = {
      podStatement: pod.statement,
      podMechanism: pod.mechanism,
      podRegion: pod.region,
      span,
      ordinal: i,
      distanceYears: distance,
      podDistanceYears: podDistance,
      pressures: pressuresOut.value.pressures,
      stateSummary,
      recentEvents,
      entityRoster: (() => {
        const ended = world.endedEntities(branchId)
        return world
          .resolveEntities(branchId)
          .filter((e) => !ended.has(e.id))
          .map((e) => ({ slug: e.slug, name: e.name, type: e.type }))
      })(),
      batchSize,
      wildcardBudget: dial.wildcardBudget(distance),
      dial,
      subPodStatement: branch.subPod?.statement ?? null,
      indexSummary,
      speculative: i === epilogueIndex,
    }

    // Symposium derivation (v2/M17): three chairs draft, one merges, and what
    // they could not settle survives as contested marks instead of being
    // smoothed away. Standard derivation is one historian and one call.
    let title: string
    let summary: string
    let drafts: DraftEvent[]
    let provenance: ReturnType<typeof makeProvenance>
    let contested: ReadonlyMap<string, string> = new Map()
    let claimSource: ClaimSource = { template: eraGenerate, model: '' }
    if (settings.derivation === 'symposium') {
      const symposium = await deriveEraBySymposium(ctx, eraArgs)
      title = symposium.title
      summary = symposium.summary
      drafts = symposium.events
      contested = symposium.contested
      provenance = makeProvenance(ctx, eraSynthesize, symposium.model)
      claimSource = { template: eraSynthesize, model: symposium.model }
      yield {
        type: 'warning',
        message: `era ${i}: the symposium sat, chaired by the ${symposium.chairs.join(', ')} historians`,
      }
    } else {
      const eraOut = await generateStructured(ctx.provider, eraGenerate, eraArgs, callOpts(ctx))
      title = eraOut.value.title
      summary = eraOut.value.summary
      drafts = eraOut.value.events
      provenance = makeProvenance(ctx, eraGenerate, eraOut.model)
      claimSource = {
        template: eraGenerate,
        model: eraOut.model,
        shifts: eraOut.value.indexShifts ?? [],
        drifts: eraOut.value.nameDrift ?? [],
        controls: eraOut.value.regionControl ?? [],
      }
    }

    const era: Era = {
      id: ctx.idgen.next(),
      branchId,
      ordinal: i,
      startYear: span.startYear,
      endYear: span.endYear,
      title,
      summary,
      pressures: pressuresOut.value.pressures,
      status: 'skeleton',
      detail: null,
      speculative: i === epilogueIndex,
      provenance,
    }
    yield* runReviewedEra(
      ctx,
      world,
      branchId,
      era,
      drafts,
      dial,
      provenance,
      contested,
      claimSource,
    )
  }

  yield { type: 'run.completed', branchId }
}

/** Where an era's claims came from, for their provenance (v2/M18). */
interface ClaimSource {
  template: Parameters<typeof makeProvenance>[1]
  model: string
  shifts?: readonly DraftIndexShift[]
  drifts?: readonly DraftNameDrift[]
  controls?: readonly DraftRegionControl[]
}

/** Dual review → commit → critique report → claims → convergence scan, for one era. */
async function* runReviewedEra(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  era: Era,
  drafts: Parameters<typeof refineBatch>[0]['drafts'],
  dial: ReturnType<typeof dialParams>,
  provenance: ReturnType<typeof makeProvenance>,
  /** Symposium marginalia (v2/M17): draft ref → what the chairs could not settle. */
  contested: ReadonlyMap<string, string> = new Map(),
  /** Index shifts and name drifts this era asserted (v2/M18). */
  claimSource?: ClaimSource,
): AsyncGenerator<PipelineEvent> {
  let refined = await refineBatch({ ctx, world, branchId, era, drafts, dial, provenance })
  for (const warning of refined.warnings) yield { type: 'warning', message: warning }

  // The symposium's unsettled readings ride into the ledger as contested marks
  // with the dispute attached, on top of whatever the critic decided.
  if (contested.size > 0) {
    const marks = new Map<string, string>()
    for (const [ref, note] of contested) {
      const eventId = refined.batch.refToEventId.get(ref)
      if (eventId) marks.set(eventId, note)
    }
    if (marks.size > 0) {
      refined = {
        ...refined,
        batch: {
          ...refined.batch,
          events: refined.batch.events.map((event) => {
            const note = marks.get(event.id)
            if (!note) return event
            return {
              ...event,
              flags: { ...event.flags, contested: true },
              criticNotes: [
                ...(event.criticNotes ?? []),
                { type: 'contested' as const, severity: 'note' as const, note },
              ],
            }
          }),
        },
      }
    }
  }

  if (refined.batch.events.length === 0) {
    throw new GenerationValidationError('era-generate', [
      `every event of era "${era.title}" was dropped by the dual review`,
      ...refined.warnings,
    ])
  }

  // Geographic advisory (v2/M15): keyword-inferred, so it warns, never drops.
  for (const issue of geographicAdvisories(world, branchId, refined.batch.events)) {
    yield { type: 'warning', message: issue.message }
  }

  // Relevance guard, machine half (v2/M14): an era none of whose events
  // trace back to the divergence has drifted into generic period content.
  // The era still commits (the critic and the prompts are the teeth; this is
  // the tripwire), but the drift is flagged where the user can see it.
  const reach = batchReachesPod(world, branchId, refined.batch)
  if (!reach.connected && era.ordinal > 0) {
    yield {
      type: 'warning',
      message: `era "${era.title}" drifted off the divergence: no event's cause chain reaches the seed within ${reach.minHops === null ? 'any number of' : reach.minHops} hops (on-divergence check)`,
    }
  }

  world.addEra(era)
  yield { type: 'era.started', era }
  yield* commitBatch(world, refined.batch)

  const report = buildCritiqueReport(ctx, branchId, era.id, refined.verdicts, provenance)
  world.addCritique(report)
  yield { type: 'critique.completed', report }

  // The Court of Plausibility's transcripts (v2/M17), bound to committed events.
  for (const record of refined.courtRecords) {
    world.addCourtRecord(record)
    yield { type: 'court.completed', record }
  }

  // Regional index readings and name drift (v2/M18), bound the same way.
  if (claimSource) {
    yield* recordClaims(
      ctx,
      world,
      branchId,
      era,
      refined.batch,
      claimSource.template,
      claimSource.model,
      claimSource.shifts,
      claimSource.drifts,
      claimSource.controls,
    )
  }

  // ---- Stage 4: convergence scan (§P3) -----------------------------------
  const midYear = Math.round((era.startYear + era.endYear) / 2)
  const halfWidth = Math.ceil((era.endYear - era.startYear) / 2)
  const candidates = anchorsNear(midYear, halfWidth + 25, {
    region: world.pod.region,
    limit: 8,
  })
  if (candidates.length > 0) {
    const idToRef = new Map([...refined.batch.refToEventId].map(([ref, id]) => [id, ref]))
    // The era is already committed; a failed scan must not undo it. Degrade to
    // a warning and let the era stand unscanned - aborts still propagate.
    let scan: GeneratedValue<ConvergenceScanOut> | null
    try {
      scan = await generateStructured(
        ctx.provider,
        convergenceScan,
        {
          podStatement: world.pod.statement,
          region: world.pod.region,
          events: refined.batch.events.map((e) => ({
            ref: idToRef.get(e.id) ?? 'd0',
            year: e.date.year,
            title: e.title,
            summary: e.summary,
          })),
          candidates,
        },
        callOpts(ctx),
      )
    } catch (error) {
      if (error instanceof GenerationAbortedError) throw error
      scan = null
      const message = error instanceof Error ? error.message : String(error)
      yield {
        type: 'warning',
        message: `convergence scan failed for era "${era.title}" - the era stands, unscanned: ${message}`,
      }
    }
    const candidateById = new Map(candidates.map((c) => [c.id, c]))
    const matches = scan === null ? [] : scan.value.matches
    const scanModel = scan === null ? '' : scan.model
    for (const match of matches) {
      const eventId = refined.batch.refToEventId.get(match.ref)
      const anchor = candidateById.get(match.anchorId)
      if (!eventId || !anchor) {
        yield {
          type: 'warning',
          message: `convergence match ignored (${match.ref} → ${match.anchorId})`,
        }
        continue
      }
      // Convergence 2.0 (v2/M18): lateness is arithmetic, not opinion, so the
      // engine computes it rather than asking. The attractor and the path note
      // are the model's, defaulted when an older template does not offer them.
      const converged = refined.batch.events.find((e) => e.id === eventId)
      const point: ConvergencePoint = {
        id: ctx.idgen.next(),
        branchId,
        eventId,
        anchorId: match.anchorId,
        similarityNote: match.similarityNote,
        attractor: match.attractor ?? 'institutional',
        latenessYears: (converged?.date.year ?? anchor.year) - anchor.year,
        pathNote: match.pathNote ?? null,
        provenance: makeProvenance(ctx, convergenceScan, scanModel),
      }
      world.addConvergence(point)
      world.markConvergence(branchId, eventId)
      yield { type: 'convergence.found', point, eventId }
    }
  }

  yield { type: 'era.completed', era }
}
