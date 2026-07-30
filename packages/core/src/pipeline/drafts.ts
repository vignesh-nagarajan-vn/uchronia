import type {
  CausalEdge,
  DraftEvent,
  Entity,
  Event,
  GeneratedProvenance,
  StateDelta,
  StateFact,
  StateRecord,
} from '@uchronia/schemas'
import type { Clock, IdGen } from '../ports.js'
import type { World } from '../world.js'

export interface ResolvedBatch {
  events: Event[]
  /** Entities the batch introduced, in introduction order. */
  newEntities: Entity[]
  edges: CausalEdge[]
  /** Machine-fixable oddities the pipeline surfaces but tolerates. */
  warnings: string[]
  /** Draft ref → minted event id (for critic verdicts and convergence refs). */
  refToEventId: Map<string, string>
}

export interface DraftContext {
  world: World
  branchId: string
  eraId: string
  idgen: IdGen
  clock: Clock
  provenance: GeneratedProvenance
}

function factsToRecord(facts: StateFact[]): StateRecord {
  const record: StateRecord = {}
  for (const fact of facts) record[fact.key] = fact.value
  return record
}

/**
 * Turn validated LLM drafts into committed-shape rows: mint ids, resolve
 * slugs and refs (e<n> = 1-based position in the branch's visible history at
 * batch start; d<n> = within batch), fold key/value facts into state records,
 * compute distance from the POD. Unknown references are machine-fixable -
 * dropped with a warning; semantic validity is the validator's job.
 */
export function resolveDrafts(ctx: DraftContext, drafts: DraftEvent[]): ResolvedBatch {
  const { world, branchId, eraId, idgen, clock, provenance } = ctx
  const warnings: string[] = []

  const visibleBefore = world.resolveEvents(branchId)
  const podYear = world.pod.year

  // Stable order: by year, ties keep draft order. Ordinals follow.
  const ordered = [...drafts].sort((a, b) => a.year - b.year)
  let nextOrdinal = world.ownEvents(branchId).length

  const slugToId = new Map<string, string>()
  for (const entity of world.resolveEntities(branchId)) slugToId.set(entity.slug, entity.id)

  const refToEventId = new Map<string, string>()
  for (const draft of ordered) refToEventId.set(draft.ref, idgen.next())

  const now = clock.now().toISOString()
  const newEntities: Entity[] = []
  const batchSlugs = new Set<string>()
  const events: Event[] = []
  const edges: CausalEdge[] = []

  for (const draft of ordered) {
    const eventId = refToEventId.get(draft.ref)
    if (!eventId) continue

    // Introduce this draft's new entities first (a draft may delta them too).
    for (const def of draft.newEntities) {
      if (slugToId.has(def.slug)) {
        warnings.push(
          `draft ${draft.ref} re-introduces existing entity "${def.slug}"; treating as a reference`,
        )
        continue
      }
      // Slugs are timeline-unique but visibility is branch-local: a sibling
      // branch this one cannot see may already own the slug. Rename
      // deterministically - parallel histories are allowed their own
      // "Improved Method"; batch-internal references keep using the original.
      let storedSlug = def.slug
      let n = 2
      // Consult the batch's own renames too: two drafts may independently
      // land on the same stored slug (one renamed onto it, one asking for it).
      while (world.entityBySlug(storedSlug) || batchSlugs.has(storedSlug)) {
        storedSlug = `${def.slug}-${n++}`
      }
      if (storedSlug !== def.slug) {
        warnings.push(
          `entity slug "${def.slug}" is taken on an invisible branch; stored as "${storedSlug}"`,
        )
      }
      const entity: Entity = {
        id: idgen.next(),
        timelineId: world.timeline.id,
        slug: storedSlug,
        type: def.type,
        name: def.name,
        description: def.description,
        initialState: factsToRecord(def.initialState),
        introducedByEventId: eventId,
        // Lives (v2/M18). An unstated birth year stays null rather than
        // falling back to the introducing event: a person who walks into the
        // record at forty was not born there, and a guessed year would be
        // indistinguishable from an attested one downstream. Succession points
        // at the drafted slug, not the stored rename, because that is the name
        // the rest of the batch used.
        bornYear: def.bornYear ?? null,
        counterfactual: def.counterfactual ?? false,
        succeedsSlug: def.succeedsSlug ?? null,
        createdAt: now,
        provenance,
      }
      batchSlugs.add(storedSlug)
      slugToId.set(def.slug, entity.id)
      newEntities.push(entity)
    }

    const entityIds: string[] = []
    for (const slug of draft.entitySlugs) {
      const id = slugToId.get(slug)
      if (!id) {
        warnings.push(`draft ${draft.ref} references unknown entity slug "${slug}"; dropped`)
        continue
      }
      if (!entityIds.includes(id)) entityIds.push(id)
    }

    const deltas: StateDelta[] = []
    for (const delta of draft.deltas) {
      const id = slugToId.get(delta.entitySlug)
      if (!id) {
        warnings.push(
          `draft ${draft.ref} delta targets unknown entity slug "${delta.entitySlug}"; dropped`,
        )
        continue
      }
      deltas.push({
        entityId: id,
        patch: factsToRecord(delta.patch),
        note: delta.note,
        // Conditional spread, matching regenerate.ts: stored deltas carry the
        // key only when the draft set it.
        ...(delta.ends !== undefined ? { ends: delta.ends } : {}),
      })
    }

    for (const cause of draft.causes) {
      let fromEventId: string | undefined
      if (cause.ref.startsWith('d')) {
        fromEventId = refToEventId.get(cause.ref)
        if (fromEventId === eventId) {
          warnings.push(`draft ${draft.ref} claims itself as a cause; dropped`)
          continue
        }
      } else {
        const position = Number(cause.ref.slice(1))
        fromEventId = visibleBefore[position - 1]?.id
      }
      if (!fromEventId) {
        warnings.push(`draft ${draft.ref} cause ref "${cause.ref}" resolves to nothing; dropped`)
        continue
      }
      edges.push({
        id: idgen.next(),
        branchId,
        fromEventId,
        toEventId: eventId,
        kind: cause.kind,
        strength: cause.strength,
      })
    }

    events.push({
      id: eventId,
      branchId,
      eraId,
      ordinal: nextOrdinal++,
      date: { year: draft.year, label: draft.dateLabel },
      title: draft.title,
      summary: draft.summary,
      detail: null,
      entityIds,
      deltas,
      lenses: draft.lenses,
      plausibility: draft.plausibility,
      distanceFromPod: Math.max(0, draft.year - podYear),
      wildcard: draft.wildcard,
      flags: { disputed: false, convergence: false, contested: false },
      criticNotes: null,
      provenance,
    })
  }

  return { events, newEntities, edges, warnings, refToEventId }
}

/**
 * Within-batch causes may point at a draft that lands *later* in year order -
 * a cause from the future. Those edges are dropped here (with a warning)
 * rather than committed, since the store forbids nothing about them but
 * history should not run backwards.
 */
export function dropBackwardsEdges(batch: ResolvedBatch): ResolvedBatch {
  const position = new Map(batch.events.map((e, i) => [e.id, i]))
  const kept: CausalEdge[] = []
  for (const edge of batch.edges) {
    const from = position.get(edge.fromEventId)
    const to = position.get(edge.toEventId)
    if (from !== undefined && to !== undefined && from > to) {
      batch.warnings.push(
        `edge from a later event dropped (${edge.fromEventId} → ${edge.toEventId})`,
      )
      continue
    }
    kept.push(edge)
  }
  return { ...batch, edges: kept }
}
