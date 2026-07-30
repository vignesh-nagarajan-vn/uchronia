import { z } from 'zod'
import { UlidString } from './ids.js'
import { Lens } from './lens.js'
import { Provenance } from './provenance.js'
import { StateDelta } from './state.js'

export const EventDate = z.object({
  /** Negative = BC; no year zero. */
  year: z.number().int(),
  /** Display form: "Spring 1454", "c. 40 BC". */
  label: z.string().min(1),
})
export type EventDate = z.infer<typeof EventDate>

export const Plausibility = z.object({
  score: z.number().min(0).max(1),
  rationale: z.string().min(1),
})
export type Plausibility = z.infer<typeof Plausibility>

export const CRITIQUE_ISSUE_TYPES = [
  'anachronism',
  'contradiction-with-state',
  'implausible-leap',
  'teleology',
  'great-man-overreach',
  'presentism',
  'cliche-collapse',
  'tone',
  'on-divergence',
  'contested',
] as const
export const CritiqueIssueType = z.enum(CRITIQUE_ISSUE_TYPES)
export type CritiqueIssueType = z.infer<typeof CritiqueIssueType>

export const CritiqueIssue = z.object({
  type: CritiqueIssueType,
  severity: z.enum(['note', 'warning', 'fail']),
  note: z.string().min(1),
})
export type CritiqueIssue = z.infer<typeof CritiqueIssue>

/**
 * The persisted event. Causal edges are stored separately ({@link CausalEdge}
 * rows); the API serves {@link EventView} with `causes`/`effects` computed from
 * the edges visible on the requested branch. Storing the arrays here would let
 * a child branch's edges mutate inherited events - see docs/DATA_MODEL.md.
 */
export const Event = z.object({
  id: UlidString,
  branchId: UlidString,
  eraId: UlidString,
  /** Position within its branch's own events, 0-based. Fork cuts use this. */
  ordinal: z.number().int().min(0),
  date: EventDate,
  title: z.string().min(1),
  summary: z.string().min(1),
  /** Expanded narrative; null until lazily generated. */
  detail: z.string().nullable(),
  entityIds: z.array(UlidString),
  deltas: z.array(StateDelta),
  lenses: z.array(Lens).min(1),
  plausibility: Plausibility,
  /** Years since the point of divergence. */
  distanceFromPod: z.number().int().min(0),
  /** Sampled as a low-structural-implication candidate (dial-controlled). */
  wildcard: z.boolean(),
  flags: z.object({
    disputed: z.boolean(),
    convergence: z.boolean(),
    /** Symposium specialists genuinely disagreed here (v2/M17). */
    contested: z.boolean().default(false),
  }),
  /** Attached when the critic keeps flagging after bounded retries. */
  criticNotes: z.array(CritiqueIssue).nullable(),
  provenance: Provenance,
})
export type Event = z.infer<typeof Event>

/** API shape: event plus its derived causal adjacency (edge ids). */
export const EventView = Event.extend({
  causes: z.array(UlidString),
  effects: z.array(UlidString),
})
export type EventView = z.infer<typeof EventView>
