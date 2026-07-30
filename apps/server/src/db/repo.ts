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
  PointOfDivergence,
  Timeline,
  TimelineAggregate,
  TimelineSettings,
  TimelineSummary,
} from '@uchronia/schemas'
import { and, count, desc, eq, inArray, isNull } from 'drizzle-orm'
import type { Db } from './client.js'
import * as t from './schema.js'

export type RunTraceRow = typeof t.runTraces.$inferSelect
export type RunTraceInsert = typeof t.runTraces.$inferInsert
export type RunTraceSummaryRow = Omit<RunTraceRow, 'system' | 'prompt' | 'response'>

type EventRow = typeof t.events.$inferSelect

function rowToEvent(row: EventRow): Event {
  return {
    id: row.id,
    branchId: row.branchId,
    eraId: row.eraId,
    ordinal: row.ordinal,
    date: { year: row.year, label: row.dateLabel },
    title: row.title,
    summary: row.summary,
    detail: row.detail,
    entityIds: row.entityIds,
    deltas: row.deltas,
    lenses: row.lenses,
    plausibility: row.plausibility,
    distanceFromPod: row.distanceFromPod,
    wildcard: row.wildcard,
    flags: { disputed: row.disputed, convergence: row.convergence },
    criticNotes: row.criticNotes ?? null,
    provenance: row.provenance,
  }
}

function eventToRow(e: Event): typeof t.events.$inferInsert {
  return {
    id: e.id,
    branchId: e.branchId,
    eraId: e.eraId,
    ordinal: e.ordinal,
    year: e.date.year,
    dateLabel: e.date.label,
    title: e.title,
    summary: e.summary,
    detail: e.detail,
    entityIds: e.entityIds,
    deltas: e.deltas,
    lenses: e.lenses,
    plausibility: e.plausibility,
    distanceFromPod: e.distanceFromPod,
    wildcard: e.wildcard,
    disputed: e.flags.disputed,
    convergence: e.flags.convergence,
    criticNotes: e.criticNotes,
    provenance: e.provenance,
  }
}

/**
 * The repository: SQLite rows ↔ domain objects. Reads hydrate whole timeline
 * aggregates (core's World does the thinking); writes are row-granular so the
 * pipeline can persist accepted history as it streams.
 */
export class Repo {
  constructor(private readonly db: Db) {}

  timelineExists(id: string): boolean {
    return (
      this.db.select({ id: t.timelines.id }).from(t.timelines).where(eq(t.timelines.id, id)).all()
        .length > 0
    )
  }

  listTimelines(): TimelineSummary[] {
    // Three queries total, not three per timeline - this backs the landing view.
    const rows = this.db.select().from(t.timelines).all()
    const branchRows = this.db
      .select({
        id: t.branches.id,
        timelineId: t.branches.timelineId,
        parentBranchId: t.branches.parentBranchId,
      })
      .from(t.branches)
      .all()
    const eventCounts = this.db
      .select({ branchId: t.events.branchId, n: count() })
      .from(t.events)
      .groupBy(t.events.branchId)
      .all()

    const eventsByBranch = new Map(eventCounts.map((r) => [r.branchId, r.n]))
    const byTimeline = new Map<string, { count: number; events: number; rootId: string | null }>()
    for (const b of branchRows) {
      const agg = byTimeline.get(b.timelineId) ?? { count: 0, events: 0, rootId: null }
      agg.count += 1
      agg.events += eventsByBranch.get(b.id) ?? 0
      if (b.parentBranchId === null) agg.rootId = b.id
      byTimeline.set(b.timelineId, agg)
    }

    return rows.map((row) => {
      const agg = byTimeline.get(row.id)
      return {
        id: row.id,
        title: row.title,
        createdAt: row.createdAt,
        settings: row.settings,
        branchCount: agg?.count ?? 0,
        eventCount: agg?.events ?? 0,
        rootBranchId: agg?.rootId ?? '',
      }
    })
  }

  branchTimelineId(branchId: string): string | null {
    const row = this.db
      .select({ timelineId: t.branches.timelineId })
      .from(t.branches)
      .where(eq(t.branches.id, branchId))
      .get()
    return row?.timelineId ?? null
  }

  createTimeline(timeline: Timeline, pod: PointOfDivergence, rootBranch: Branch): void {
    this.db.transaction((tx) => {
      tx.insert(t.timelines)
        .values({
          id: timeline.id,
          title: timeline.title,
          createdAt: timeline.createdAt,
          settings: timeline.settings,
        })
        .run()
      tx.insert(t.pods)
        .values({
          id: pod.id,
          timelineId: pod.timelineId,
          raw: pod.raw,
          statement: pod.statement,
          year: pod.year,
          dateLabel: pod.dateLabel,
          region: pod.region,
          mechanism: pod.mechanism,
          baselineContext: pod.baselineContext,
          provenance: pod.provenance,
        })
        .run()
      tx.insert(t.branches).values(rootBranch).run()
    })
  }

  loadAggregate(timelineId: string): TimelineAggregate | null {
    const timeline = this.db.select().from(t.timelines).where(eq(t.timelines.id, timelineId)).get()
    if (!timeline) return null
    const podRow = this.db.select().from(t.pods).where(eq(t.pods.timelineId, timelineId)).get()
    if (!podRow) return null

    const branchRows = this.db
      .select()
      .from(t.branches)
      .where(eq(t.branches.timelineId, timelineId))
      .all()
    const branchIds = branchRows.map((b) => b.id)

    const eraRows = branchIds.length
      ? this.db.select().from(t.eras).where(inArray(t.eras.branchId, branchIds)).all()
      : []
    const eventRows = branchIds.length
      ? this.db.select().from(t.events).where(inArray(t.events.branchId, branchIds)).all()
      : []
    const entityRows = this.db
      .select()
      .from(t.entities)
      .where(eq(t.entities.timelineId, timelineId))
      .all()
    const edgeRows = branchIds.length
      ? this.db.select().from(t.edges).where(inArray(t.edges.branchId, branchIds)).all()
      : []
    const eventIds = eventRows.map((e) => e.id)
    const artifactRows = eventIds.length
      ? this.db.select().from(t.artifacts).where(inArray(t.artifacts.eventId, eventIds)).all()
      : []
    const convergenceRows = branchIds.length
      ? this.db
          .select()
          .from(t.convergencePoints)
          .where(inArray(t.convergencePoints.branchId, branchIds))
          .all()
      : []
    const critiqueRows = branchIds.length
      ? this.db
          .select()
          .from(t.critiqueReports)
          .where(inArray(t.critiqueReports.branchId, branchIds))
          .all()
      : []
    const biographyRows = branchIds.length
      ? this.db.select().from(t.biographies).where(inArray(t.biographies.branchId, branchIds)).all()
      : []

    return {
      formatVersion: 1,
      timeline: {
        id: timeline.id,
        title: timeline.title,
        createdAt: timeline.createdAt,
        settings: timeline.settings,
      },
      pod: {
        id: podRow.id,
        timelineId: podRow.timelineId,
        raw: podRow.raw,
        statement: podRow.statement,
        year: podRow.year,
        dateLabel: podRow.dateLabel,
        region: podRow.region,
        mechanism: podRow.mechanism,
        baselineContext: podRow.baselineContext,
        provenance: podRow.provenance,
      },
      branches: branchRows.map((b) => ({ ...b, subPod: b.subPod ?? null })),
      eras: eraRows,
      events: eventRows.map(rowToEvent),
      entities: entityRows,
      edges: edgeRows,
      artifacts: artifactRows,
      convergencePoints: convergenceRows,
      critiqueReports: critiqueRows.map((c) => ({ ...c, eraId: c.eraId ?? null })),
      biographies: biographyRows,
    }
  }

  /** Bulk insert a whole aggregate (import). Caller checks for collisions first. */
  saveAggregate(agg: TimelineAggregate): void {
    this.db.transaction((tx) => {
      tx.insert(t.timelines)
        .values({
          id: agg.timeline.id,
          title: agg.timeline.title,
          createdAt: agg.timeline.createdAt,
          settings: agg.timeline.settings,
        })
        .run()
      tx.insert(t.pods)
        .values({
          id: agg.pod.id,
          timelineId: agg.pod.timelineId,
          raw: agg.pod.raw,
          statement: agg.pod.statement,
          year: agg.pod.year,
          dateLabel: agg.pod.dateLabel,
          region: agg.pod.region,
          mechanism: agg.pod.mechanism,
          baselineContext: agg.pod.baselineContext,
          provenance: agg.pod.provenance,
        })
        .run()
      if (agg.branches.length) tx.insert(t.branches).values(agg.branches).run()
      if (agg.eras.length) tx.insert(t.eras).values(agg.eras).run()
      if (agg.events.length) tx.insert(t.events).values(agg.events.map(eventToRow)).run()
      if (agg.entities.length) tx.insert(t.entities).values(agg.entities).run()
      if (agg.edges.length) tx.insert(t.edges).values(agg.edges).run()
      if (agg.artifacts.length) tx.insert(t.artifacts).values(agg.artifacts).run()
      if (agg.convergencePoints.length)
        tx.insert(t.convergencePoints).values(agg.convergencePoints).run()
      if (agg.critiqueReports.length) tx.insert(t.critiqueReports).values(agg.critiqueReports).run()
      if (agg.biographies.length) tx.insert(t.biographies).values(agg.biographies).run()
    })
  }

  deleteTimeline(timelineId: string): boolean {
    if (!this.timelineExists(timelineId)) return false
    this.db.transaction((tx) => {
      const branchIds = tx
        .select({ id: t.branches.id })
        .from(t.branches)
        .where(eq(t.branches.timelineId, timelineId))
        .all()
        .map((b) => b.id)
      if (branchIds.length) {
        const eventIds = tx
          .select({ id: t.events.id })
          .from(t.events)
          .where(inArray(t.events.branchId, branchIds))
          .all()
          .map((e) => e.id)
        if (eventIds.length) {
          tx.delete(t.artifacts).where(inArray(t.artifacts.eventId, eventIds)).run()
        }
        tx.delete(t.convergencePoints).where(inArray(t.convergencePoints.branchId, branchIds)).run()
        tx.delete(t.critiqueReports).where(inArray(t.critiqueReports.branchId, branchIds)).run()
        tx.delete(t.biographies).where(inArray(t.biographies.branchId, branchIds)).run()
        tx.delete(t.runTraces).where(inArray(t.runTraces.branchId, branchIds)).run()
        tx.delete(t.edges).where(inArray(t.edges.branchId, branchIds)).run()
        tx.delete(t.events).where(inArray(t.events.branchId, branchIds)).run()
        tx.delete(t.eras).where(inArray(t.eras.branchId, branchIds)).run()
      }
      tx.delete(t.entities).where(eq(t.entities.timelineId, timelineId)).run()
      tx.delete(t.branches).where(eq(t.branches.timelineId, timelineId)).run()
      tx.delete(t.pods).where(eq(t.pods.timelineId, timelineId)).run()
      tx.delete(t.timelines).where(eq(t.timelines.id, timelineId)).run()
    })
    return true
  }

  // ---------------------------------------------- row-granular writes (pipeline)

  insertBranch(branch: Branch): void {
    this.db.insert(t.branches).values(branch).run()
  }

  insertEra(era: Era): void {
    this.db.insert(t.eras).values(era).run()
  }

  insertEvent(event: Event): void {
    this.db.insert(t.events).values(eventToRow(event)).run()
  }

  insertEntity(entity: Entity): void {
    this.db.insert(t.entities).values(entity).run()
  }

  insertEdge(edge: CausalEdge): void {
    this.db.insert(t.edges).values(edge).run()
  }

  insertArtifact(artifact: Artifact): void {
    this.db.insert(t.artifacts).values(artifact).run()
  }

  insertConvergence(point: ConvergencePoint): void {
    this.db.insert(t.convergencePoints).values(point).run()
  }

  insertCritique(report: CritiqueReport): void {
    this.db.insert(t.critiqueReports).values(report).run()
  }

  insertBiography(bio: EntityBiography): void {
    this.db.insert(t.biographies).values(bio).run()
  }

  // ---- Engine Room traces (v2/M15) ----------------------------------------

  insertTrace(row: RunTraceInsert): void {
    this.db.insert(t.runTraces).values(row).run()
  }

  /** Newest first, without the heavy prompt/response columns. */
  listTraces(branchId: string, limit = 500): RunTraceSummaryRow[] {
    return this.db
      .select({
        id: t.runTraces.id,
        branchId: t.runTraces.branchId,
        runId: t.runTraces.runId,
        templateId: t.runTraces.templateId,
        templateVersion: t.runTraces.templateVersion,
        role: t.runTraces.role,
        model: t.runTraces.model,
        inputTokens: t.runTraces.inputTokens,
        outputTokens: t.runTraces.outputTokens,
        cacheReadTokens: t.runTraces.cacheReadTokens,
        cacheWriteTokens: t.runTraces.cacheWriteTokens,
        attempts: t.runTraces.attempts,
        validationIssues: t.runTraces.validationIssues,
        ok: t.runTraces.ok,
        error: t.runTraces.error,
        durationMs: t.runTraces.durationMs,
        createdAt: t.runTraces.createdAt,
      })
      .from(t.runTraces)
      .where(eq(t.runTraces.branchId, branchId))
      .orderBy(desc(t.runTraces.id))
      .limit(limit)
      .all()
  }

  getTrace(id: string): RunTraceRow | undefined {
    return this.db.select().from(t.runTraces).where(eq(t.runTraces.id, id)).get()
  }

  /**
   * Keep only the newest `keepRuns` generation runs per branch (run ids are
   * ULIDs, so id order is time order), and cap one-off traces (null runId) at
   * 200 per branch.
   */
  pruneTraces(branchId: string, keepRuns: number): void {
    const runIds = this.db
      .selectDistinct({ runId: t.runTraces.runId })
      .from(t.runTraces)
      .where(eq(t.runTraces.branchId, branchId))
      .all()
      .map((r) => r.runId)
      .filter((r): r is string => r !== null)
      .sort()
      .reverse()
    const stale = runIds.slice(Math.max(0, keepRuns))
    if (stale.length > 0) {
      this.db.delete(t.runTraces).where(inArray(t.runTraces.runId, stale)).run()
    }
    const oneOffs = this.db
      .select({ id: t.runTraces.id })
      .from(t.runTraces)
      .where(and(eq(t.runTraces.branchId, branchId), isNull(t.runTraces.runId)))
      .orderBy(desc(t.runTraces.id))
      .all()
      .slice(200)
    if (oneOffs.length > 0) {
      this.db
        .delete(t.runTraces)
        .where(
          inArray(
            t.runTraces.id,
            oneOffs.map((r) => r.id),
          ),
        )
        .run()
    }
  }

  deleteTracesForBranch(branchId: string): void {
    this.db.delete(t.runTraces).where(eq(t.runTraces.branchId, branchId)).run()
  }

  updateEventDetail(eventId: string, detail: string): void {
    this.db.update(t.events).set({ detail }).where(eq(t.events.id, eventId)).run()
  }

  /** Full content rewrite of one event (user-facing regeneration). */
  updateEventContent(event: Event): void {
    this.db.update(t.events).set(eventToRow(event)).where(eq(t.events.id, event.id)).run()
  }

  updateEventFlags(
    eventId: string,
    flags: { disputed?: boolean; convergence?: boolean; criticNotes?: CritiqueIssue[] | null },
  ): void {
    this.db.update(t.events).set(flags).where(eq(t.events.id, eventId)).run()
  }

  updateEraDetail(eraId: string, detail: string): void {
    this.db.update(t.eras).set({ detail, status: 'expanded' }).where(eq(t.eras.id, eraId)).run()
  }

  updateEraAfterGeneration(era: Era): void {
    this.db
      .update(t.eras)
      .set({ title: era.title, summary: era.summary, pressures: era.pressures, status: era.status })
      .where(eq(t.eras.id, era.id))
      .run()
  }

  updateTimelineSettings(timelineId: string, settings: TimelineSettings): void {
    this.db.update(t.timelines).set({ settings }).where(eq(t.timelines.id, timelineId)).run()
  }

  updateTimelineTitle(timelineId: string, title: string): void {
    this.db.update(t.timelines).set({ title }).where(eq(t.timelines.id, timelineId)).run()
  }

  /**
   * Delete one leaf branch and everything it owns. The caller guarantees the
   * branch has no children (their visible history would dangle).
   */
  deleteBranchCascade(branchId: string): void {
    this.db.transaction((tx) => {
      const eventIds = tx
        .select({ id: t.events.id })
        .from(t.events)
        .where(eq(t.events.branchId, branchId))
        .all()
        .map((e) => e.id)
      if (eventIds.length) {
        tx.delete(t.artifacts).where(inArray(t.artifacts.eventId, eventIds)).run()
        // Entities introduced by this branch's events are visible only here.
        tx.delete(t.entities).where(inArray(t.entities.introducedByEventId, eventIds)).run()
      }
      tx.delete(t.edges).where(eq(t.edges.branchId, branchId)).run()
      tx.delete(t.convergencePoints).where(eq(t.convergencePoints.branchId, branchId)).run()
      tx.delete(t.critiqueReports).where(eq(t.critiqueReports.branchId, branchId)).run()
      tx.delete(t.biographies).where(eq(t.biographies.branchId, branchId)).run()
      tx.delete(t.runTraces).where(eq(t.runTraces.branchId, branchId)).run()
      tx.delete(t.events).where(eq(t.events.branchId, branchId)).run()
      tx.delete(t.eras).where(eq(t.eras.branchId, branchId)).run()
      tx.delete(t.branches).where(eq(t.branches.id, branchId)).run()
    })
  }

  /** Branch ids that fork off the given branch. */
  childBranchIds(branchId: string): string[] {
    return this.db
      .select({ id: t.branches.id })
      .from(t.branches)
      .where(eq(t.branches.parentBranchId, branchId))
      .all()
      .map((b) => b.id)
  }

  /**
   * Roll back one era and everything hanging off its events (resume healing).
   * The caller guarantees nothing forked from these events.
   */
  deleteEraCascade(eraId: string, eventIds: string[]): void {
    this.db.transaction((tx) => {
      if (eventIds.length) {
        tx.delete(t.artifacts).where(inArray(t.artifacts.eventId, eventIds)).run()
        tx.delete(t.edges).where(inArray(t.edges.toEventId, eventIds)).run()
        tx.delete(t.edges).where(inArray(t.edges.fromEventId, eventIds)).run()
        tx.delete(t.convergencePoints).where(inArray(t.convergencePoints.eventId, eventIds)).run()
        tx.delete(t.entities).where(inArray(t.entities.introducedByEventId, eventIds)).run()
        tx.delete(t.events).where(inArray(t.events.id, eventIds)).run()
      }
      tx.delete(t.critiqueReports).where(eq(t.critiqueReports.eraId, eraId)).run()
      tx.delete(t.eras).where(eq(t.eras.id, eraId)).run()
    })
  }
}
