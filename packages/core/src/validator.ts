import type { World } from './world.js'

/**
 * The machine validator (§P4): pure-code graph rules that cannot be argued
 * with. It runs over a branch's resolved view before commits are accepted and
 * again in tests over hydrated aggregates. Rules never throw — they report.
 */
export type RuleId =
  | 'dates-monotonic'
  | 'event-within-era'
  | 'edge-endpoints-exist'
  | 'entities-exist'
  | 'deltas-apply'
  | 'plausibility-range'
  | 'era-overlap'
  | 'fork-normalized'

export interface ValidationIssue {
  rule: RuleId
  message: string
  eventId?: string
  eraId?: string
  edgeId?: string
  branchId?: string
}

type Rule = (world: World, branchId: string) => ValidationIssue[]

/** Event dates must be non-decreasing within each era (§11.3). */
export const datesMonotonicWithinEra: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const lastYearByEra = new Map<string, { year: number; eventId: string }>()
  for (const event of world.resolveEvents(branchId)) {
    const prev = lastYearByEra.get(event.eraId)
    if (prev && event.date.year < prev.year) {
      issues.push({
        rule: 'dates-monotonic',
        eventId: event.id,
        eraId: event.eraId,
        message: `event ${event.id} (${event.date.year}) precedes ${prev.eventId} (${prev.year}) within the same era`,
      })
    }
    lastYearByEra.set(event.eraId, { year: event.date.year, eventId: event.id })
  }
  return issues
}

/** Event years must fall inside their era's range. */
export const eventWithinEra: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  for (const event of world.resolveEvents(branchId)) {
    const era = world.getEra(event.eraId)
    if (event.date.year < era.startYear || event.date.year > era.endYear) {
      issues.push({
        rule: 'event-within-era',
        eventId: event.id,
        eraId: era.id,
        message: `event ${event.id} year ${event.date.year} outside era range ${era.startYear}–${era.endYear}`,
      })
    }
  }
  return issues
}

/** Edges owned by chain branches must reference existing, visible events (§11.3). */
export const edgeEndpointsExist: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const chain = new Set(world.segments(branchId).map((s) => s.branchId))
  const visible = new Set(world.resolveEvents(branchId).map((e) => e.id))
  for (const edge of world.allEdges()) {
    if (!chain.has(edge.branchId)) continue
    for (const [side, id] of [
      ['from', edge.fromEventId],
      ['to', edge.toEventId],
    ] as const) {
      let exists = true
      try {
        world.getEvent(id)
      } catch {
        exists = false
      }
      if (!exists) {
        issues.push({
          rule: 'edge-endpoints-exist',
          edgeId: edge.id,
          message: `edge ${edge.id} ${side}-event ${id} does not exist`,
        })
      }
    }
    // An edge owned by this branch must connect events this branch can see.
    if (edge.branchId === branchId) {
      if (!visible.has(edge.toEventId) || !visible.has(edge.fromEventId)) {
        issues.push({
          rule: 'edge-endpoints-exist',
          edgeId: edge.id,
          message: `edge ${edge.id} references events not visible from its own branch ${branchId}`,
        })
      }
    }
  }
  return issues
}

/** Events must reference existing entities, in entityIds and in deltas (§11.3). */
export const entitiesExist: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const known = new Set(world.allEntities().map((e) => e.id))
  for (const event of world.resolveEvents(branchId)) {
    for (const id of event.entityIds) {
      if (!known.has(id)) {
        issues.push({
          rule: 'entities-exist',
          eventId: event.id,
          message: `event ${event.id} references unknown entity ${id}`,
        })
      }
    }
    for (const delta of event.deltas) {
      if (!known.has(delta.entityId)) {
        issues.push({
          rule: 'entities-exist',
          eventId: event.id,
          message: `event ${event.id} delta targets unknown entity ${delta.entityId}`,
        })
      }
    }
  }
  return issues
}

/** Deltas must apply to entities that are alive at that point of the replay (§11.3). */
export const deltasApplyCleanly: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const alive = new Set<string>()
  for (const entity of world.allEntities()) {
    if (entity.introducedByEventId === null) alive.add(entity.id)
  }
  const introducedBy = new Map<string, string[]>()
  for (const entity of world.allEntities()) {
    if (entity.introducedByEventId !== null) {
      const list = introducedBy.get(entity.introducedByEventId) ?? []
      list.push(entity.id)
      introducedBy.set(entity.introducedByEventId, list)
    }
  }
  for (const event of world.resolveEvents(branchId)) {
    for (const id of introducedBy.get(event.id) ?? []) alive.add(id)
    for (const delta of event.deltas) {
      if (!alive.has(delta.entityId)) {
        issues.push({
          rule: 'deltas-apply',
          eventId: event.id,
          message: `event ${event.id} mutates entity ${delta.entityId} before its introduction on this branch`,
        })
      }
    }
  }
  return issues
}

/** Plausibility scores stay in [0,1] (§11.3; re-checked beyond the schema). */
export const plausibilityInRange: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  for (const event of world.resolveEvents(branchId)) {
    const s = event.plausibility.score
    if (!(s >= 0 && s <= 1) || Number.isNaN(s)) {
      issues.push({
        rule: 'plausibility-range',
        eventId: event.id,
        message: `event ${event.id} plausibility ${s} outside [0,1]`,
      })
    }
  }
  return issues
}

/** A branch's own eras must be well-formed and non-overlapping (§11.3). */
export const eraRangesNonOverlapping: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const own = world.ownEras(branchId)
  for (const era of own) {
    if (era.endYear < era.startYear) {
      issues.push({
        rule: 'era-overlap',
        eraId: era.id,
        message: `era ${era.id} ends (${era.endYear}) before it starts (${era.startYear})`,
      })
    }
  }
  for (let i = 1; i < own.length; i++) {
    const prev = own[i - 1]
    const next = own[i]
    if (prev && next && next.startYear < prev.endYear) {
      issues.push({
        rule: 'era-overlap',
        eraId: next.id,
        message: `era ${next.id} (${next.startYear}–${next.endYear}) overlaps ${prev.id} (${prev.startYear}–${prev.endYear})`,
      })
    }
  }
  return issues
}

/** Fork pointers must be normalized: the fork event is owned by the stored parent. */
export const forkNormalized: Rule = (world, branchId) => {
  const branch = world.getBranch(branchId)
  if (branch.parentBranchId === null) return []
  if (branch.forkEventId === null) {
    return [
      {
        rule: 'fork-normalized',
        branchId,
        message: `branch ${branchId} has a parent but no fork event`,
      },
    ]
  }
  try {
    const forkEvent = world.getEvent(branch.forkEventId)
    if (forkEvent.branchId !== branch.parentBranchId) {
      return [
        {
          rule: 'fork-normalized',
          branchId,
          message: `branch ${branchId} fork event ${forkEvent.id} is owned by ${forkEvent.branchId}, not its stored parent ${branch.parentBranchId}`,
        },
      ]
    }
  } catch {
    return [
      {
        rule: 'fork-normalized',
        branchId,
        message: `branch ${branchId} fork event ${branch.forkEventId} does not exist`,
      },
    ]
  }
  return []
}

export const ALL_RULES: readonly Rule[] = [
  forkNormalized,
  datesMonotonicWithinEra,
  eventWithinEra,
  edgeEndpointsExist,
  entitiesExist,
  deltasApplyCleanly,
  plausibilityInRange,
  eraRangesNonOverlapping,
]

/** Run every rule against one branch's resolved view. Empty result = clean. */
export function validateBranch(world: World, branchId: string): ValidationIssue[] {
  // fork-normalized failures make segment resolution itself throw, so run it
  // first and stop there if the chain is unresolvable.
  const forkIssues = forkNormalized(world, branchId)
  if (forkIssues.length > 0) return forkIssues
  return ALL_RULES.flatMap((rule) => rule(world, branchId))
}

/** Validate every branch of the world. */
export function validateWorld(world: World): ValidationIssue[] {
  return world.allBranches().flatMap((branch) => validateBranch(world, branch.id))
}
