import type {
  ArtifactBody,
  ArtifactKind,
  ClaimBody,
  ConvergenceAttractor,
  CritiqueIssue,
  EdgeKind,
  EntityType,
  EraStatus,
  EventVerdict,
  Lens,
  Mechanism,
  Plausibility,
  Pressure,
  Provenance,
  StateDelta,
  StateRecord,
  StylingHints,
  SubPod,
  TimelineSettings,
} from '@uchronia/schemas'
import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Persistence mirrors packages/schemas one-to-one; nested objects live in JSON
 * columns. Referential integrity is core's job (validator + store guards), so
 * no SQL foreign keys - deletes run as explicit transactions in the repo.
 */

export const timelines = sqliteTable('timelines', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  settings: text('settings', { mode: 'json' }).$type<TimelineSettings>().notNull(),
})

export const pods = sqliteTable(
  'pods',
  {
    id: text('id').primaryKey(),
    timelineId: text('timeline_id').notNull(),
    raw: text('raw').notNull(),
    statement: text('statement').notNull(),
    year: integer('year').notNull(),
    dateLabel: text('date_label').notNull(),
    region: text('region').notNull(),
    mechanism: text('mechanism').$type<Mechanism>().notNull(),
    baselineContext: text('baseline_context').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [uniqueIndex('pods_timeline_uq').on(t.timelineId)],
)

export const branches = sqliteTable(
  'branches',
  {
    id: text('id').primaryKey(),
    timelineId: text('timeline_id').notNull(),
    parentBranchId: text('parent_branch_id'),
    forkEventId: text('fork_event_id'),
    subPod: text('sub_pod', { mode: 'json' }).$type<SubPod | null>(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('branches_timeline_idx').on(t.timelineId)],
)

export const eras = sqliteTable(
  'eras',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    startYear: integer('start_year').notNull(),
    endYear: integer('end_year').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    pressures: text('pressures', { mode: 'json' }).$type<Pressure[]>().notNull(),
    status: text('status').$type<EraStatus>().notNull(),
    detail: text('detail'),
    /** The epilogue era: past the horizon, and openly a guess (v2/M18). */
    speculative: integer('speculative', { mode: 'boolean' }).notNull().default(false),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('eras_branch_idx').on(t.branchId)],
)

export const events = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    eraId: text('era_id').notNull(),
    ordinal: integer('ordinal').notNull(),
    year: integer('year').notNull(),
    dateLabel: text('date_label').notNull(),
    title: text('title').notNull(),
    summary: text('summary').notNull(),
    detail: text('detail'),
    entityIds: text('entity_ids', { mode: 'json' }).$type<string[]>().notNull(),
    deltas: text('deltas', { mode: 'json' }).$type<StateDelta[]>().notNull(),
    lenses: text('lenses', { mode: 'json' }).$type<Lens[]>().notNull(),
    plausibility: text('plausibility', { mode: 'json' }).$type<Plausibility>().notNull(),
    distanceFromPod: integer('distance_from_pod').notNull(),
    wildcard: integer('wildcard', { mode: 'boolean' }).notNull(),
    disputed: integer('disputed', { mode: 'boolean' }).notNull(),
    convergence: integer('convergence', { mode: 'boolean' }).notNull(),
    contested: integer('contested', { mode: 'boolean' }).notNull().default(false),
    criticNotes: text('critic_notes', { mode: 'json' }).$type<CritiqueIssue[] | null>(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [
    index('events_branch_idx').on(t.branchId),
    index('events_era_idx').on(t.eraId),
    // Backstop against concurrent runs minting the same position twice.
    uniqueIndex('events_branch_ordinal_uq').on(t.branchId, t.ordinal),
  ],
)

export const entities = sqliteTable(
  'entities',
  {
    id: text('id').primaryKey(),
    timelineId: text('timeline_id').notNull(),
    slug: text('slug').notNull(),
    type: text('type').$type<EntityType>().notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    initialState: text('initial_state', { mode: 'json' }).$type<StateRecord>().notNull(),
    introducedByEventId: text('introduced_by_event_id'),
    /** Lives (v2/M18): when it began, whether it ever existed, whom it follows. */
    bornYear: integer('born_year'),
    counterfactual: integer('counterfactual', { mode: 'boolean' }).notNull().default(false),
    succeedsSlug: text('succeeds_slug'),
    createdAt: text('created_at').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [
    index('entities_timeline_idx').on(t.timelineId),
    uniqueIndex('entities_slug_uq').on(t.timelineId, t.slug),
  ],
)

export const edges = sqliteTable(
  'edges',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    fromEventId: text('from_event_id').notNull(),
    toEventId: text('to_event_id').notNull(),
    kind: text('kind').$type<EdgeKind>().notNull(),
    strength: real('strength').notNull(),
  },
  (t) => [index('edges_branch_idx').on(t.branchId), index('edges_to_idx').on(t.toEventId)],
)

export const artifacts = sqliteTable(
  'artifacts',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull(),
    kind: text('kind').$type<ArtifactKind>().notNull(),
    title: text('title').notNull(),
    body: text('body', { mode: 'json' }).$type<ArtifactBody>().notNull(),
    stylingHints: text('styling_hints', { mode: 'json' }).$type<StylingHints>().notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('artifacts_event_idx').on(t.eventId)],
)

export const convergencePoints = sqliteTable(
  'convergence_points',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    eventId: text('event_id').notNull(),
    anchorId: text('anchor_id').notNull(),
    similarityNote: text('similarity_note').notNull(),
    /** Convergence 2.0 (v2/M18): which attractor pulled, how late, by what road. */
    attractor: text('attractor').$type<ConvergenceAttractor>().notNull().default('institutional'),
    latenessYears: integer('lateness_years').notNull().default(0),
    pathNote: text('path_note'),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('convergence_branch_idx').on(t.branchId)],
)

/** In-world historiography (v2/M20): rival schools and their glosses. */
export const schools = sqliteTable(
  'schools',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    name: text('name').notNull(),
    stance: text('stance').notNull(),
    seat: text('seat').notNull(),
    blindSpot: text('blind_spot').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('schools_branch_idx').on(t.branchId)],
)

export const interpretations = sqliteTable(
  'interpretations',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    eventId: text('event_id').notNull(),
    schoolId: text('school_id').notNull(),
    gloss: text('gloss').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [
    index('interpretations_branch_idx').on(t.branchId),
    index('interpretations_event_idx').on(t.eventId),
  ],
)

/** Claims (v2/M18): regional index readings and name drift, bound to events. */
export const claims = sqliteTable(
  'claims',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    eventId: text('event_id').notNull(),
    year: integer('year').notNull(),
    body: text('body', { mode: 'json' }).$type<ClaimBody>().notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('claims_branch_idx').on(t.branchId), index('claims_event_idx').on(t.eventId)],
)

/** Court of Plausibility transcripts (v2/M17), one exchange per tried event. */
export const courtRecords = sqliteTable(
  'court_records',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    eventId: text('event_id').notNull(),
    advocate: text('advocate').notNull(),
    skeptic: text('skeptic').notNull(),
    ruling: text('ruling', { mode: 'json' })
      .$type<{
        outcome: 'uphold' | 'revise' | 'dispute'
        opinion: string
        instruction: string | null
      }>()
      .notNull(),
    createdAt: text('created_at').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('court_branch_idx').on(t.branchId), index('court_event_idx').on(t.eventId)],
)

export const critiqueReports = sqliteTable(
  'critique_reports',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    batchId: text('batch_id').notNull(),
    eraId: text('era_id'),
    verdicts: text('verdicts', { mode: 'json' }).$type<EventVerdict[]>().notNull(),
    createdAt: text('created_at').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [index('critiques_branch_idx').on(t.branchId)],
)

/**
 * Engine Room traces (v2/M15): one row per structured provider call - the
 * rendered prompt, the raw response, usage, retries, and timing. Pruned to
 * the most recent runs per branch (UCHRONIA_TRACE_RUNS).
 */
export const runTraces = sqliteTable(
  'run_traces',
  {
    id: text('id').primaryKey(),
    branchId: text('branch_id').notNull(),
    /** Groups one generation run; null for one-off calls (intake, expanders). */
    runId: text('run_id'),
    templateId: text('template_id').notNull(),
    templateVersion: text('template_version').notNull(),
    role: text('role').notNull(),
    model: text('model').notNull(),
    system: text('system').notNull(),
    prompt: text('prompt').notNull(),
    response: text('response').notNull(),
    inputTokens: integer('input_tokens').notNull(),
    outputTokens: integer('output_tokens').notNull(),
    cacheReadTokens: integer('cache_read_tokens'),
    cacheWriteTokens: integer('cache_write_tokens'),
    attempts: integer('attempts').notNull(),
    validationIssues: text('validation_issues', { mode: 'json' }).$type<string[]>().notNull(),
    ok: integer('ok', { mode: 'boolean' }).notNull(),
    error: text('error'),
    durationMs: integer('duration_ms').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('traces_branch_idx').on(t.branchId), index('traces_run_idx').on(t.runId)],
)

export const biographies = sqliteTable(
  'biographies',
  {
    id: text('id').primaryKey(),
    entityId: text('entity_id').notNull(),
    branchId: text('branch_id').notNull(),
    biography: text('biography').notNull(),
    provenance: text('provenance', { mode: 'json' }).$type<Provenance>().notNull(),
  },
  (t) => [
    uniqueIndex('biographies_entity_branch_uq').on(t.entityId, t.branchId),
    index('biographies_branch_idx').on(t.branchId),
  ],
)
