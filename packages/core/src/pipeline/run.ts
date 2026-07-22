import type { Era, GeneratedProvenance } from '@uchronia/schemas'
import { dialParams } from '../dial.js'
import { GenerationValidationError } from '../errors.js'
import type { LLMProvider } from '../llm.js'
import type { Clock, IdGen } from '../ports.js'
import { seedConsequences } from '../prompts/seed-consequences.js'
import type { PromptTemplate } from '../prompts/types.js'
import { validateBranch } from '../validator.js'
import { World } from '../world.js'
import { dropBackwardsEdges, type ResolvedBatch, resolveDrafts } from './drafts.js'
import type { PipelineEvent } from './events.js'
import { generateStructured } from './structured.js'

export interface PipelineCtx {
  provider: LLMProvider
  idgen: IdGen
  clock: Clock
}

export function makeProvenance(
  ctx: PipelineCtx,
  template: Pick<PromptTemplate<unknown, unknown>, 'id' | 'version'>,
  model: string,
): GeneratedProvenance {
  return {
    kind: 'generated',
    model,
    templateId: template.id,
    templateVersion: template.version,
    generatedAt: ctx.clock.now().toISOString(),
    mode: ctx.provider.mode,
  }
}

/**
 * Trial-apply a resolved batch on a clone of the world and run the machine
 * validator. Returns the issues attributable to the batch — the real world is
 * untouched until the caller commits.
 */
export function validateBatchOnClone(
  world: World,
  branchId: string,
  era: Era,
  batch: ResolvedBatch,
): string[] {
  const clone = World.fromAggregate(world.toAggregate())
  const preexisting = new Set(validateBranch(clone, branchId).map((i) => i.message))
  if (!clone.ownEras(branchId).some((e) => e.id === era.id)) clone.addEra(era)
  for (const entity of batch.newEntities) clone.addEntity(entity)
  for (const event of batch.events) clone.addEvent(event)
  for (const edge of batch.edges) clone.addEdge(edge)
  return validateBranch(clone, branchId)
    .filter((issue) => !preexisting.has(issue.message))
    .map((issue) => `${issue.rule}: ${issue.message}`)
}

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
 * Generation v1 (§4.1 stages 2): seed consequences for a fresh branch. The
 * era loop (stage 3) extends this generator at M5; the critic loop wires in
 * at M4. Mutates `world` as it goes — the caller persists the event stream.
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

    const batch = dropBackwardsEdges(
      resolveDrafts(
        { world, branchId, eraId: era.id, idgen: ctx.idgen, clock: ctx.clock, provenance },
        generated.value.events,
      ),
    )
    for (const warning of batch.warnings) yield { type: 'warning', message: warning }

    const issues = validateBatchOnClone(world, branchId, era, batch)
    if (issues.length > 0) {
      // M4 turns this into the regenerate → dispute loop; v1 fails loudly.
      throw new GenerationValidationError(seedConsequences.id, issues)
    }

    world.addEra(era)
    yield { type: 'era.started', era }
    yield* commitBatch(world, batch)
    yield { type: 'era.completed', era }
  }

  yield { type: 'run.completed', branchId }
}
