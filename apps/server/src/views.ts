import type { World } from '@uchronia/core'
import type { BranchView, EntityView, EventView } from '@uchronia/schemas'

/** Resolve one branch into the client's workhorse read shape. Pure over World. */
export function assembleBranchView(world: World, branchId: string): BranchView {
  const branch = world.getBranch(branchId)
  const resolvedEvents = world.resolveEvents(branchId)
  const edges = world.resolveEdges(branchId)

  const causes = new Map<string, string[]>()
  const effects = new Map<string, string[]>()
  for (const edge of edges) {
    causes.set(edge.toEventId, [...(causes.get(edge.toEventId) ?? []), edge.id])
    effects.set(edge.fromEventId, [...(effects.get(edge.fromEventId) ?? []), edge.id])
  }

  const events: EventView[] = resolvedEvents.map((e) => ({
    ...e,
    causes: causes.get(e.id) ?? [],
    effects: effects.get(e.id) ?? [],
  }))

  const state = world.stateAt(branchId)
  const ended = world.endedEntities(branchId)
  const entities: EntityView[] = world.resolveEntities(branchId).map((entity) => ({
    ...entity,
    state: state.get(entity.id) ?? { ...entity.initialState },
    changeLog: world.changeLog(branchId, entity.id),
    endedByEventId: ended.get(entity.id)?.eventId ?? null,
    tenures: world.roleTenures(branchId, entity.id),
  }))

  return {
    timeline: world.timeline,
    pod: world.pod,
    branch,
    branches: world.allBranches(),
    eras: world.resolveEras(branchId),
    events,
    entities,
    edges,
    convergences: world.resolveConvergences(branchId),
    artifacts: resolvedEvents.flatMap((e) => world.artifactsForEvent(e.id)),
    biographies: world.allBiographies().filter((b) => b.branchId === branchId),
    courtRecords: world.courtRecordsFor(branchId),
    claims: world.resolveClaims(branchId),
  }
}
