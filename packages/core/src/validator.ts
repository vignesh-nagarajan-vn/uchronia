import { TECH_PREREQUISITES } from '@uchronia/schemas'
import { regionsAreFar } from './baseline.js'
import { REGION_KEYWORDS } from './pod-sketch.js'
import type { World } from './world.js'

/**
 * The machine validator (§P4): pure-code graph rules that cannot be argued
 * with. It runs over a branch's resolved view before commits are accepted and
 * again in tests over hydrated aggregates. Rules never throw - they report.
 */
export type RuleId =
  | 'dates-monotonic'
  | 'event-within-era'
  | 'edge-endpoints-exist'
  | 'entities-exist'
  | 'deltas-apply'
  | 'no-posthumous-mutation'
  | 'plausibility-range'
  | 'era-overlap'
  | 'fork-normalized'
  | 'tech-prerequisite'
  | 'demographic-plausibility'
  | 'geographic-plausibility'

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

/**
 * An entity ended by a terminal delta must never be mutated afterwards on the
 * same branch. Endedness is replay-derived (StateDelta.ends), so the rule is
 * branch-local for free: a sibling that cannot see the death sees no death.
 * Deltas within the ending event itself are allowed (the death may set facts).
 */
export const noPosthumousMutation: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const endedAt = new Map<string, string>()
  for (const event of world.resolveEvents(branchId)) {
    for (const delta of event.deltas) {
      const endingEvent = endedAt.get(delta.entityId)
      if (endingEvent !== undefined && endingEvent !== event.id) {
        issues.push({
          rule: 'no-posthumous-mutation',
          eventId: event.id,
          message: `event ${event.id} mutates entity ${delta.entityId}, which was ended by event ${endingEvent}`,
        })
      }
    }
    for (const delta of event.deltas) {
      if (delta.ends && !endedAt.has(delta.entityId)) endedAt.set(delta.entityId, event.id)
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

// ---- v2/M15 hard rules -----------------------------------------------------

/**
 * Effective earliest-plausible year per tech tag: max of the tag's own window
 * and every prerequisite's effective floor, resolved over the DAG (cycle-safe;
 * a malformed cycle falls back to the tag's own window rather than looping).
 */
const TECH_BY_TAG = new Map(TECH_PREREQUISITES.map((t) => [t.tag, t]))
const TECH_PATTERNS = TECH_PREREQUISITES.map((t) => ({
  tag: t.tag,
  regex: new RegExp(t.pattern, 'i'),
}))

export function effectiveTechFloor(tag: string, visiting = new Set<string>()): number {
  const tech = TECH_BY_TAG.get(tag)
  if (!tech || visiting.has(tag)) return tech?.earliestPlausibleYear ?? Number.NEGATIVE_INFINITY
  visiting.add(tag)
  let floor = tech.earliestPlausibleYear
  for (const requirement of tech.requires) {
    floor = Math.max(floor, effectiveTechFloor(requirement, visiting))
  }
  visiting.delete(tag)
  return floor
}

/**
 * No radio in the middle ages: an event whose text names a technology before
 * that technology's effective floor (own window + prerequisite floors) is a
 * machine violation. Windows are deliberately generous - this engine lets
 * histories accelerate technology; the rule only catches the absurd.
 */
export const techPrerequisites: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  for (const event of world.resolveEvents(branchId)) {
    const text = `${event.title} ${event.summary}`
    for (const { tag, regex } of TECH_PATTERNS) {
      if (!regex.test(text)) continue
      const floor = effectiveTechFloor(tag)
      if (event.date.year < floor) {
        issues.push({
          rule: 'tech-prerequisite',
          eventId: event.id,
          message: `event ${event.id} (${event.date.year}) invokes "${tag}" before its earliest plausible year ${floor}`,
        })
      }
    }
  }
  return issues
}

/** No person stays an actor for longer than a long human life. */
const MAX_PERSON_ACTIVE_SPAN = 110

/**
 * Demographic sanity (v2/M15): a person-type entity whose activity (deltas or
 * participation) spans more than a very long human lifetime has outlived
 * plausibility - the model forgot to let them die. First activity counts from
 * the introducing event (or first mention for POD-seeded persons).
 */
export const demographicPlausibility: Rule = (world, branchId) => {
  const issues: ValidationIssue[] = []
  const persons = new Map(
    world
      .resolveEntities(branchId)
      .filter((e) => e.type === 'person')
      .map((e) => [e.id, e]),
  )
  const firstSeen = new Map<string, number>()
  for (const event of world.resolveEvents(branchId)) {
    const touched = new Set([...event.entityIds, ...event.deltas.map((d) => d.entityId)])
    for (const id of touched) {
      if (!persons.has(id)) continue
      const first = firstSeen.get(id)
      if (first === undefined) {
        firstSeen.set(id, event.date.year)
        continue
      }
      const span = event.date.year - first
      if (span > MAX_PERSON_ACTIVE_SPAN) {
        const person = persons.get(id)
        issues.push({
          rule: 'demographic-plausibility',
          eventId: event.id,
          message: `event ${event.id} has person "${person?.slug ?? id}" active ${span} years after first appearing (${first}) - longer than any human life`,
        })
      }
    }
  }
  return issues
}

export const ALL_RULES: readonly Rule[] = [
  forkNormalized,
  datesMonotonicWithinEra,
  eventWithinEra,
  edgeEndpointsExist,
  entitiesExist,
  deltasApplyCleanly,
  noPosthumousMutation,
  plausibilityInRange,
  eraRangesNonOverlapping,
  techPrerequisites,
  demographicPlausibility,
]

/**
 * Geographic plausibility (v2/M15), ADVISORY grade: event locations are only
 * keyword-inferred (events carry no region field until the M22 map claims),
 * so this never drops - the pipeline streams its findings as warnings. It
 * flags the same actor appearing in two far-apart theatres within a year,
 * before the telegraph era made that even organizationally plausible.
 */
export function geographicAdvisories(
  world: World,
  branchId: string,
  batchEvents: ReadonlyArray<{
    id: string
    date: { year: number }
    title: string
    summary: string
    entityIds: string[]
  }>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const inferRegion = (title: string, summary: string): string | null =>
    REGION_KEYWORDS.find(([, pattern]) => pattern.test(`${title} ${summary}`))?.[0] ?? null

  // Last inferred sighting per entity across the visible past.
  const lastSeen = new Map<string, { region: string; year: number }>()
  for (const event of world.resolveEvents(branchId)) {
    const region = inferRegion(event.title, event.summary)
    if (!region) continue
    for (const id of event.entityIds) lastSeen.set(id, { region, year: event.date.year })
  }
  const slugById = new Map(world.resolveEntities(branchId).map((e) => [e.id, e.slug]))

  for (const event of batchEvents) {
    const region = inferRegion(event.title, event.summary)
    if (region) {
      for (const id of event.entityIds) {
        const prior = lastSeen.get(id)
        if (
          prior &&
          event.date.year < 1850 &&
          event.date.year - prior.year <= 1 &&
          prior.region !== region &&
          regionsAreFar(prior.region, region)
        ) {
          issues.push({
            rule: 'geographic-plausibility',
            eventId: event.id,
            message: `"${slugById.get(id) ?? id}" acts in ${region} within a year of acting in ${prior.region} (${prior.year}) - implausible before the telegraph`,
          })
        }
        lastSeen.set(id, { region, year: event.date.year })
      }
    }
  }
  return issues
}

/** Run every rule against one branch's resolved view. Empty result = clean. */
export function validateBranch(world: World, branchId: string): ValidationIssue[] {
  // fork-normalized failures make segment resolution itself throw, so run it
  // first and stop there if the chain is unresolvable. Having passed, skip
  // its slot in ALL_RULES rather than running it twice.
  const forkIssues = forkNormalized(world, branchId)
  if (forkIssues.length > 0) return forkIssues
  return ALL_RULES.flatMap((rule) => (rule === forkNormalized ? [] : rule(world, branchId)))
}

/** Validate every branch of the world. */
export function validateWorld(world: World): ValidationIssue[] {
  return world.allBranches().flatMap((branch) => validateBranch(world, branch.id))
}
