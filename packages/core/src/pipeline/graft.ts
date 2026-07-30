import type { CausalEdge, Era, Event } from '@uchronia/schemas'
import { IntegrityError, NotFoundError } from '../errors.js'
import { type ValidationIssue, validateBranch } from '../validator.js'
import { World } from '../world.js'
import type { PipelineCtx } from './ctx.js'

/**
 * The graft (v2/M19): transplant one event and the consequences that hang
 * directly off it from one branch onto another. No provider call is involved;
 * this is surgery on the graph, and the machine validator is the anaesthetist.
 *
 * Scope is deliberately narrow. One event plus its direct consequences (one
 * hop), onto a leaf branch only, never onto a branch that already sees the
 * source event. A wider transplant would be a merge, and merging two derived
 * histories is a different product.
 */

export interface GraftArgs {
  /** The branch the event is taken from. */
  sourceBranchId: string
  /** The branch it is grafted onto. Must be a leaf. */
  targetBranchId: string
  eventId: string
  /**
   * Accept a graft the validator objects to, marking the transplanted events
   * disputed instead of refusing. Hard conflicts still refuse.
   */
  force?: boolean
}

export interface GraftConflict {
  /** `hard` conflicts always refuse; `soft` ones can be accepted under force. */
  severity: 'hard' | 'soft'
  rule: string
  message: string
}

export interface GraftResult {
  /** Events actually written onto the target, in order. */
  events: Event[]
  edges: CausalEdge[]
  era: Era
  conflicts: GraftConflict[]
  /** True when the graft was written marked disputed rather than clean. */
  disputed: boolean
}

/**
 * Rules whose violation means the transplanted graph is simply broken, as
 * opposed to merely implausible in its new home. A history is allowed to be
 * surprising; it is not allowed to be malformed.
 */
const HARD_RULES = new Set([
  'dates-monotonic',
  'event-within-era',
  'edge-endpoints-exist',
  'entities-exist',
  'deltas-apply',
  'no-posthumous-mutation',
  'fork-normalized',
])

/** The event plus everything it directly causes on its own branch. */
export function graftSet(world: World, sourceBranchId: string, eventId: string): Event[] {
  const visible = world.resolveEvents(sourceBranchId)
  const root = visible.find((e) => e.id === eventId)
  if (!root) throw new NotFoundError('event', eventId)
  const direct = new Set(
    world
      .resolveEdges(sourceBranchId)
      .filter((edge) => edge.fromEventId === eventId)
      .map((edge) => edge.toEventId),
  )
  return [root, ...visible.filter((e) => direct.has(e.id))].sort(
    (a, b) => a.date.year - b.date.year || a.ordinal - b.ordinal,
  )
}

export function graftEvent(ctx: PipelineCtx, world: World, args: GraftArgs): GraftResult {
  const { sourceBranchId, targetBranchId, eventId } = args
  world.getBranch(sourceBranchId)
  world.getBranch(targetBranchId)
  if (sourceBranchId === targetBranchId) {
    throw new IntegrityError('a branch cannot be grafted onto itself')
  }
  if (world.allBranches().some((b) => b.parentBranchId === targetBranchId)) {
    throw new IntegrityError(
      'only a leaf branch can receive a graft; its children would inherit history they never derived',
    )
  }
  const alreadyVisible = new Set(world.resolveEvents(targetBranchId).map((e) => e.id))
  if (alreadyVisible.has(eventId)) {
    throw new IntegrityError('the target branch already sees that event')
  }

  const source = graftSet(world, sourceBranchId, eventId)

  // An event is about somebody. One whose actors this branch never met cannot
  // come across: its deltas would be addressed to people who do not exist
  // here. The asked-for event failing that test refuses the whole graft; a
  // consequence failing it simply stays behind, and the reader is told.
  const knownEntities = new Set(world.resolveEntities(targetBranchId).map((e) => e.id))
  const strangersIn = (event: Event): string[] => [
    ...new Set(
      [...event.entityIds, ...event.deltas.map((d) => d.entityId)].filter(
        (id) => !knownEntities.has(id),
      ),
    ),
  ]
  const conflicts: GraftConflict[] = []
  const rootStrangers = source[0] ? strangersIn(source[0]) : []
  if (rootStrangers.length > 0) {
    throw new IntegrityError(
      `the graft cannot be applied: it acts on ${rootStrangers.map((id) => world.getEntity(id).name).join(', ')}, who this branch has never met. Fork earlier, or graft an event whose actors both lines share.`,
    )
  }
  const carried: Event[] = []
  for (const event of source) {
    const strangers = strangersIn(event)
    if (strangers.length === 0) {
      carried.push(event)
      continue
    }
    conflicts.push({
      severity: 'soft',
      rule: 'graft-stranger-actors',
      message: `"${event.title}" stayed behind: it acts on ${strangers.map((id) => world.getEntity(id).name).join(', ')}, who this branch has never met`,
    })
  }

  // Grafted events land in an era of their own, spanning exactly the years
  // they happened in on the line they came from. That era will usually
  // overlap eras this branch already has, which is the honest picture: the
  // branch now carries material dated inside history it already wrote.
  const ownEras = world.ownEras(targetBranchId)
  const years = carried.map((e) => e.date.year)
  const era: Era = {
    id: ctx.idgen.next(),
    branchId: targetBranchId,
    ordinal: ownEras.length,
    startYear: Math.min(...years),
    endYear: Math.max(...years),
    title: 'Grafted from another line',
    summary: `Transplanted from "${world.getBranch(sourceBranchId).name}": ${carried[0]?.title ?? 'an event'}, with what hung directly off it.`,
    pressures: [],
    status: 'skeleton',
    detail: null,
    speculative: false,
    provenance: { kind: 'user' },
  }

  // Entities are timeline-scoped, so a transplanted event's actors already
  // exist; only events and edges are minted anew.
  const ordinalBase = world.ownEvents(targetBranchId).length
  const idMap = new Map<string, string>()
  const events: Event[] = carried.map((event, i) => {
    const id = ctx.idgen.next()
    idMap.set(event.id, id)
    return {
      ...event,
      id,
      branchId: targetBranchId,
      eraId: era.id,
      ordinal: ordinalBase + i,
      distanceFromPod: Math.max(0, event.date.year - world.pod.year),
      flags: { ...event.flags, convergence: false },
      // A graft is the reader's act, not the model's, whatever produced the
      // prose. Keeping the original provenance would claim a derivation that
      // never happened on this branch.
      provenance: { kind: 'user' },
    }
  })

  // Only causality wholly inside the graft survives: an edge whose cause
  // stayed on the source branch would point at an event this branch cannot see.
  const edges: CausalEdge[] = []
  for (const edge of world.resolveEdges(sourceBranchId)) {
    const to = idMap.get(edge.toEventId)
    if (!to) continue
    const from = idMap.get(edge.fromEventId)
    if (!from) {
      conflicts.push({
        severity: 'soft',
        rule: 'graft-severed-cause',
        message: `the cause of "${world.getEvent(edge.toEventId).title}" stayed behind on the source branch; the graft arrives without it`,
      })
      continue
    }
    edges.push({
      ...edge,
      id: ctx.idgen.next(),
      branchId: targetBranchId,
      fromEventId: from,
      toEventId: to,
    })
  }

  // Trial-apply on a clone: the real world is untouched until this passes.
  const clone = World.fromAggregate(world.toAggregate())
  const preexisting = new Set(validateBranch(clone, targetBranchId).map((i) => i.message))
  let issues: ValidationIssue[]
  try {
    clone.addEra(era)
    for (const event of events) clone.addEvent(event)
    for (const edge of edges) clone.addEdge(edge)
    issues = validateBranch(clone, targetBranchId).filter((i) => !preexisting.has(i.message))
  } catch (error) {
    throw new IntegrityError(
      `the graft cannot be applied: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  for (const issue of issues) {
    conflicts.push({
      severity: HARD_RULES.has(issue.rule) ? 'hard' : 'soft',
      rule: issue.rule,
      message: issue.message,
    })
  }

  const hard = conflicts.filter((c) => c.severity === 'hard')
  if (hard.length > 0) {
    throw new IntegrityError(
      `the graft breaks the graph and was refused: ${hard.map((c) => c.message).join('; ')}`,
    )
  }
  const soft = conflicts.filter((c) => c.severity === 'soft')
  if (soft.length > 0 && !args.force) {
    return { events: [], edges: [], era, conflicts, disputed: false }
  }

  // Accepted with friction: a graft the validator grumbled about goes in
  // visibly marked, with the grumble attached where a reader will find it.
  const disputed = soft.length > 0
  const written = disputed
    ? events.map((event) => ({
        ...event,
        flags: { ...event.flags, disputed: true },
        criticNotes: [
          ...(event.criticNotes ?? []),
          ...soft.map((c) => ({
            type: 'contradiction-with-state' as const,
            severity: 'warning' as const,
            note: `grafted from another line: ${c.message}`,
          })),
        ],
      }))
    : events

  world.addEra(era)
  for (const event of written) world.addEvent(event)
  for (const edge of edges) world.addEdge(edge)

  return { events: written, edges, era, conflicts, disputed }
}
