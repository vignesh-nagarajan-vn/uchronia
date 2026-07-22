import type {
  Artifact,
  Branch,
  CausalEdge,
  ConvergencePoint,
  CritiqueIssue,
  CritiqueReport,
  Entity,
  EntityBiography,
  Era,
  Event,
  EventView,
  LedgerLine,
  PointOfDivergence,
  StateRecord,
  SubPod,
  Timeline,
  TimelineAggregate,
  TimelineSettings,
} from '@uchronia/schemas'
import { IntegrityError, NotFoundError, PreForkImmutableError } from './errors.js'

/** One link of a branch's ancestry: include the branch's own events up to `cut`. */
export interface Segment {
  branchId: string
  /** Highest own-event ordinal included (Infinity for the leaf branch itself). */
  cut: number
}

/**
 * The in-memory world state of one timeline — the store the pipeline reads
 * snapshots from and commits accepted history into. Persistence hydrates it
 * via {@link World.fromAggregate} and saves the mutation stream elsewhere;
 * the class itself performs no IO.
 *
 * Fork semantics (§3): structural sharing. A branch's visible history is the
 * concatenation of its ancestor segments cut at each fork ordinal, plus its
 * own events. Nothing is copied; pre-fork rows are immutable from children.
 */
export class World {
  readonly timeline: Timeline
  readonly pod: PointOfDivergence

  private readonly branches = new Map<string, Branch>()
  private readonly eras = new Map<string, Era>()
  private readonly events = new Map<string, Event>()
  private readonly entities = new Map<string, Entity>()
  private readonly edges = new Map<string, CausalEdge>()
  private readonly artifacts = new Map<string, Artifact>()
  private readonly convergences = new Map<string, ConvergencePoint>()
  private readonly critiques = new Map<string, CritiqueReport>()
  private readonly biographies = new Map<string, EntityBiography>()
  private readonly slugToEntityId = new Map<string, string>()

  constructor(timeline: Timeline, pod: PointOfDivergence) {
    this.timeline = timeline
    this.pod = pod
  }

  /** Hydrate from a full aggregate. Structural only — run the validator for semantic checks. */
  static fromAggregate(aggregate: TimelineAggregate): World {
    const world = new World(aggregate.timeline, aggregate.pod)
    for (const b of aggregate.branches) world.branches.set(b.id, b)
    for (const e of aggregate.eras) world.eras.set(e.id, e)
    for (const e of aggregate.events) world.events.set(e.id, e)
    for (const e of aggregate.entities) {
      world.entities.set(e.id, e)
      world.slugToEntityId.set(e.slug, e.id)
    }
    for (const e of aggregate.edges) world.edges.set(e.id, e)
    for (const a of aggregate.artifacts) world.artifacts.set(a.id, a)
    for (const c of aggregate.convergencePoints) world.convergences.set(c.id, c)
    for (const c of aggregate.critiqueReports) world.critiques.set(c.id, c)
    for (const b of aggregate.biographies)
      world.biographies.set(World.bioKey(b.entityId, b.branchId), b)
    return world
  }

  toAggregate(): TimelineAggregate {
    return structuredClone({
      formatVersion: 1 as const,
      timeline: this.timeline,
      pod: this.pod,
      branches: [...this.branches.values()],
      eras: [...this.eras.values()],
      events: [...this.events.values()],
      entities: [...this.entities.values()],
      edges: [...this.edges.values()],
      artifacts: [...this.artifacts.values()],
      convergencePoints: [...this.convergences.values()],
      critiqueReports: [...this.critiques.values()],
      biographies: [...this.biographies.values()],
    })
  }

  private static bioKey(entityId: string, branchId: string): string {
    return `${entityId}:${branchId}`
  }

  // ---------------------------------------------------------------- queries

  getBranch(id: string): Branch {
    const b = this.branches.get(id)
    if (!b) throw new NotFoundError('branch', id)
    return b
  }

  getEra(id: string): Era {
    const e = this.eras.get(id)
    if (!e) throw new NotFoundError('era', id)
    return e
  }

  getEvent(id: string): Event {
    const e = this.events.get(id)
    if (!e) throw new NotFoundError('event', id)
    return e
  }

  getEntity(id: string): Entity {
    const e = this.entities.get(id)
    if (!e) throw new NotFoundError('entity', id)
    return e
  }

  getArtifact(id: string): Artifact {
    const a = this.artifacts.get(id)
    if (!a) throw new NotFoundError('artifact', id)
    return a
  }

  entityBySlug(slug: string): Entity | undefined {
    const id = this.slugToEntityId.get(slug)
    return id ? this.entities.get(id) : undefined
  }

  allBranches(): Branch[] {
    return [...this.branches.values()]
  }

  allEntities(): Entity[] {
    return [...this.entities.values()]
  }

  allEdges(): CausalEdge[] {
    return [...this.edges.values()]
  }

  critiqueReports(): CritiqueReport[] {
    return [...this.critiques.values()]
  }

  /** This branch's own events, ordinal-sorted. */
  ownEvents(branchId: string): Event[] {
    this.getBranch(branchId)
    return [...this.events.values()]
      .filter((e) => e.branchId === branchId)
      .sort((a, b) => a.ordinal - b.ordinal)
  }

  /** This branch's own eras, ordinal-sorted. */
  ownEras(branchId: string): Era[] {
    this.getBranch(branchId)
    return [...this.eras.values()]
      .filter((e) => e.branchId === branchId)
      .sort((a, b) => a.ordinal - b.ordinal)
  }

  /** Ancestry as segments, root-first. */
  segments(branchId: string): Segment[] {
    const out: Segment[] = []
    let current = this.getBranch(branchId)
    let cut = Number.POSITIVE_INFINITY
    for (;;) {
      out.unshift({ branchId: current.id, cut })
      if (current.parentBranchId === null) break
      if (current.forkEventId === null) {
        throw new IntegrityError(`branch ${current.id} has a parent but no fork event`)
      }
      const forkEvent = this.getEvent(current.forkEventId)
      if (forkEvent.branchId !== current.parentBranchId) {
        throw new IntegrityError(
          `branch ${current.id} fork event ${forkEvent.id} is not owned by its parent (fork not normalized)`,
        )
      }
      cut = forkEvent.ordinal
      current = this.getBranch(current.parentBranchId)
    }
    return out
  }

  /** The branch's full visible history, chronological. */
  resolveEvents(branchId: string): Event[] {
    return this.segments(branchId).flatMap((seg) =>
      this.ownEvents(seg.branchId).filter((e) => e.ordinal <= seg.cut),
    )
  }

  /** Eras visible on the branch: inherited ones in first-event order, then own empty ones. */
  resolveEras(branchId: string): Era[] {
    const seen = new Set<string>()
    const out: Era[] = []
    for (const event of this.resolveEvents(branchId)) {
      if (!seen.has(event.eraId)) {
        seen.add(event.eraId)
        out.push(this.getEra(event.eraId))
      }
    }
    for (const era of this.ownEras(branchId)) {
      if (!seen.has(era.id)) {
        seen.add(era.id)
        out.push(era)
      }
    }
    return out
  }

  /** Edges whose endpoints are both visible from the branch. */
  resolveEdges(branchId: string): CausalEdge[] {
    const chainBranches = new Set(this.segments(branchId).map((s) => s.branchId))
    const visible = new Set(this.resolveEvents(branchId).map((e) => e.id))
    return [...this.edges.values()].filter(
      (edge) =>
        chainBranches.has(edge.branchId) &&
        visible.has(edge.fromEventId) &&
        visible.has(edge.toEventId),
    )
  }

  /** Event plus derived causal adjacency, in the context of one branch. */
  eventView(branchId: string, eventId: string): EventView {
    const event = this.getEvent(eventId)
    const edges = this.resolveEdges(branchId)
    return {
      ...event,
      causes: edges.filter((e) => e.toEventId === eventId).map((e) => e.id),
      effects: edges.filter((e) => e.fromEventId === eventId).map((e) => e.id),
    }
  }

  /** Entities that exist on this branch: seeded ones plus those introduced by visible events. */
  resolveEntities(branchId: string): Entity[] {
    const visible = new Set(this.resolveEvents(branchId).map((e) => e.id))
    return [...this.entities.values()].filter(
      (ent) => ent.introducedByEventId === null || visible.has(ent.introducedByEventId),
    )
  }

  /**
   * Replay entity state on a branch, optionally stopping at (and including) an
   * event. This is the snapshot generation conditions on (P1).
   */
  stateAt(branchId: string, uptoEventId?: string): Map<string, StateRecord> {
    const events = this.resolveEvents(branchId)
    let end = events.length - 1
    if (uptoEventId !== undefined) {
      end = events.findIndex((e) => e.id === uptoEventId)
      if (end === -1) throw new NotFoundError('event visible on branch', uptoEventId)
    }

    const introducedBy = new Map<string, Entity[]>()
    const state = new Map<string, StateRecord>()
    for (const entity of this.entities.values()) {
      if (entity.introducedByEventId === null) {
        state.set(entity.id, { ...entity.initialState })
      } else {
        const list = introducedBy.get(entity.introducedByEventId) ?? []
        list.push(entity)
        introducedBy.set(entity.introducedByEventId, list)
      }
    }

    for (let i = 0; i <= end; i++) {
      const event = events[i]
      if (!event) break
      for (const entity of introducedBy.get(event.id) ?? []) {
        state.set(entity.id, { ...entity.initialState })
      }
      for (const delta of event.deltas) {
        const current = state.get(delta.entityId)
        if (current === undefined) {
          throw new IntegrityError(
            `event ${event.id} carries a delta for entity ${delta.entityId} before its introduction`,
          )
        }
        state.set(delta.entityId, { ...current, ...delta.patch })
      }
    }
    return state
  }

  /** The dossier ledger: every visible state change of one entity, in order. */
  changeLog(branchId: string, entityId: string): LedgerLine[] {
    this.getEntity(entityId)
    const lines: LedgerLine[] = []
    for (const event of this.resolveEvents(branchId)) {
      for (const delta of event.deltas) {
        if (delta.entityId === entityId) {
          lines.push({
            eventId: event.id,
            year: event.date.year,
            dateLabel: event.date.label,
            patch: delta.patch,
            note: delta.note,
          })
        }
      }
    }
    return lines
  }

  artifactsForEvent(eventId: string): Artifact[] {
    return [...this.artifacts.values()].filter((a) => a.eventId === eventId)
  }

  /** Convergence points recorded on the branch's chain, for visible events. */
  resolveConvergences(branchId: string): ConvergencePoint[] {
    const chainBranches = new Set(this.segments(branchId).map((s) => s.branchId))
    const visible = new Set(this.resolveEvents(branchId).map((e) => e.id))
    return [...this.convergences.values()].filter(
      (c) => chainBranches.has(c.branchId) && visible.has(c.eventId),
    )
  }

  biography(branchId: string, entityId: string): EntityBiography | undefined {
    return this.biographies.get(World.bioKey(entityId, branchId))
  }

  allBiographies(): EntityBiography[] {
    return [...this.biographies.values()]
  }

  // ------------------------------------------------------------- mutations

  private assertOwnEvent(branchId: string, eventId: string): Event {
    const event = this.getEvent(eventId)
    if (event.branchId !== branchId) {
      throw new PreForkImmutableError(
        `branch ${branchId} cannot alter event ${eventId} owned by ${event.branchId}`,
      )
    }
    return event
  }

  addBranch(branch: Branch): void {
    if (this.branches.has(branch.id)) throw new IntegrityError(`branch ${branch.id} already exists`)
    if (branch.parentBranchId !== null) {
      throw new IntegrityError('non-root branches must be created through fork()')
    }
    this.branches.set(branch.id, branch)
  }

  /**
   * Fork at a visible event. The stored parent is normalized to the branch
   * that owns the fork event (the visible prefix is identical either way, and
   * the delta tree renders the fork on the owning segment regardless).
   */
  fork(args: {
    id: string
    viewedBranchId: string
    forkEventId: string
    name: string
    subPod: SubPod | null
    createdAt: string
  }): Branch {
    const visible = new Set(this.resolveEvents(args.viewedBranchId).map((e) => e.id))
    if (!visible.has(args.forkEventId)) {
      throw new IntegrityError(
        `event ${args.forkEventId} is not visible from branch ${args.viewedBranchId}; cannot fork there`,
      )
    }
    const owner = this.getEvent(args.forkEventId).branchId
    const branch: Branch = {
      id: args.id,
      timelineId: this.timeline.id,
      parentBranchId: owner,
      forkEventId: args.forkEventId,
      subPod: args.subPod,
      name: args.name,
      createdAt: args.createdAt,
    }
    if (this.branches.has(branch.id)) throw new IntegrityError(`branch ${branch.id} already exists`)
    this.branches.set(branch.id, branch)
    return branch
  }

  addEra(era: Era): void {
    if (this.eras.has(era.id)) throw new IntegrityError(`era ${era.id} already exists`)
    const own = this.ownEras(era.branchId)
    if (era.ordinal !== own.length) {
      throw new IntegrityError(
        `era ordinal must be ${own.length} (next in branch ${era.branchId}), got ${era.ordinal}`,
      )
    }
    this.eras.set(era.id, era)
  }

  addEvent(event: Event): void {
    if (this.events.has(event.id)) throw new IntegrityError(`event ${event.id} already exists`)
    const era = this.getEra(event.eraId)
    if (era.branchId !== event.branchId) {
      throw new PreForkImmutableError(
        `branch ${event.branchId} cannot append events into era ${era.id} owned by ${era.branchId}`,
      )
    }
    const own = this.ownEvents(event.branchId)
    if (event.ordinal !== own.length) {
      throw new IntegrityError(
        `event ordinal must be ${own.length} (next in branch ${event.branchId}), got ${event.ordinal}`,
      )
    }
    for (const id of event.entityIds) this.getEntity(id)
    for (const delta of event.deltas) this.getEntity(delta.entityId)
    this.events.set(event.id, event)
  }

  addEntity(entity: Entity): void {
    if (this.entities.has(entity.id)) throw new IntegrityError(`entity ${entity.id} already exists`)
    if (this.slugToEntityId.has(entity.slug)) {
      throw new IntegrityError(`entity slug already taken: ${entity.slug}`)
    }
    this.entities.set(entity.id, entity)
    this.slugToEntityId.set(entity.slug, entity.id)
  }

  addEdge(edge: CausalEdge): void {
    if (this.edges.has(edge.id)) throw new IntegrityError(`edge ${edge.id} already exists`)
    this.getBranch(edge.branchId)
    this.getEvent(edge.fromEventId)
    // A branch may only claim causes *for its own* events; the from-side may be inherited.
    this.assertOwnEvent(edge.branchId, edge.toEventId)
    const visible = new Set(this.resolveEvents(edge.branchId).map((e) => e.id))
    if (!visible.has(edge.fromEventId)) {
      throw new IntegrityError(
        `edge ${edge.id}: cause ${edge.fromEventId} is not visible from branch ${edge.branchId}`,
      )
    }
    this.edges.set(edge.id, edge)
  }

  addArtifact(artifact: Artifact): void {
    if (this.artifacts.has(artifact.id)) throw new IntegrityError(`artifact ${artifact.id} exists`)
    this.getEvent(artifact.eventId)
    this.artifacts.set(artifact.id, artifact)
  }

  addConvergence(point: ConvergencePoint): void {
    if (this.convergences.has(point.id)) throw new IntegrityError(`convergence ${point.id} exists`)
    this.assertOwnEvent(point.branchId, point.eventId)
    this.convergences.set(point.id, point)
  }

  addCritique(report: CritiqueReport): void {
    if (this.critiques.has(report.id)) throw new IntegrityError(`critique ${report.id} exists`)
    this.getBranch(report.branchId)
    this.critiques.set(report.id, report)
  }

  /**
   * Fill-once lazy expansion. Detail on a shared pre-fork event is identical
   * history for every descendant, so any branch that sees the event may fill
   * it; a second fill is a no-op returning the existing text.
   */
  setEventDetail(eventId: string, detail: string): Event {
    const event = this.getEvent(eventId)
    if (event.detail !== null) return event
    const updated = { ...event, detail }
    this.events.set(eventId, updated)
    return updated
  }

  setEraDetail(eraId: string, detail: string): Era {
    const era = this.getEra(eraId)
    if (era.detail !== null) return era
    const updated: Era = { ...era, detail, status: 'expanded' }
    this.eras.set(eraId, updated)
    return updated
  }

  /** Generation-time flagging; only the owning branch's run may do this. */
  markDisputed(branchId: string, eventId: string, notes: CritiqueIssue[]): Event {
    const event = this.assertOwnEvent(branchId, eventId)
    const updated: Event = {
      ...event,
      flags: { ...event.flags, disputed: true },
      criticNotes: notes,
    }
    this.events.set(eventId, updated)
    return updated
  }

  markConvergence(branchId: string, eventId: string): Event {
    const event = this.assertOwnEvent(branchId, eventId)
    const updated: Event = { ...event, flags: { ...event.flags, convergence: true } }
    this.events.set(eventId, updated)
    return updated
  }

  setBiography(bio: EntityBiography): EntityBiography {
    const key = World.bioKey(bio.entityId, bio.branchId)
    const existing = this.biographies.get(key)
    if (existing) return existing
    this.getEntity(bio.entityId)
    this.getBranch(bio.branchId)
    this.biographies.set(key, bio)
    return bio
  }

  updateSettings(settings: TimelineSettings): void {
    // Timeline is a plain readonly reference; settings are its one mutable region.
    ;(this.timeline as { settings: TimelineSettings }).settings = settings
  }
}
