import { z } from 'zod'
import { Artifact } from './artifact.js'
import { Branch } from './branch.js'
import { Claim } from './claim.js'
import { BaselineAnchor, ConvergencePoint } from './convergence.js'
import { CourtRecord } from './court.js'
import { CausalEdge } from './edge.js'
import { EntityBiography, EntityView } from './entity.js'
import { Era } from './era.js'
import { EventView } from './event.js'
import { Lens } from './lens.js'
import { PodInterpretedOut } from './llm.js'
import { Mechanism, PointOfDivergence } from './pod.js'
import { Dial, DialAxes, Timeline, TimelineSettings } from './timeline.js'

/**
 * API contracts shared by server and web. The client parses responses against
 * these - the same schemas that validated the data on the way in.
 */

export const TimelineSummary = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.iso.datetime(),
  settings: TimelineSettings,
  branchCount: z.number().int(),
  eventCount: z.number().int(),
  /** The root branch, so opening a ledger needs no full-aggregate fetch. */
  rootBranchId: z.string(),
})
export type TimelineSummary = z.infer<typeof TimelineSummary>

/**
 * A confirmed interpretation (v2/M14): what the user accepted or edited on
 * the interpretation card. When present, creation uses it verbatim instead of
 * running intake again - the user's confirmation is the authority.
 */
export const ConfirmedInterpretation = z.object({
  statement: z.string().min(1).max(500),
  year: z.number().int(),
  dateLabel: z.string().min(1).max(80),
  region: z.string().min(1).max(80),
  mechanism: Mechanism,
  baselineContext: z.string().min(1).max(2000),
  suggestedTitle: z.string().min(1).max(120).optional(),
})
export type ConfirmedInterpretation = z.infer<typeof ConfirmedInterpretation>

export const CreateTimelineRequest = z.object({
  podText: z.string().min(4).max(2000),
  title: z.string().min(1).max(120).optional(),
  dial: Dial.optional(),
  /** Advanced dial axes (v2/M17); absent = derived from the master dial. */
  axes: DialAxes.optional(),
  /** Symposium derivation is opt-in and costs roughly four times the tokens. */
  derivation: z.enum(['standard', 'symposium']).optional(),
  /** The Court of Plausibility on disputed events (v2/M17; opt-in). */
  court: z.boolean().optional(),
  /** Append one speculative era past the horizon (v2/M18). */
  epilogue: z.boolean().optional(),
  /** Absent means deep time: the history runs to the present day (v2/M18). */
  horizonYears: z.number().int().min(10).max(6000).optional(),
  lenses: z.array(Lens).min(1).optional(),
  interpretation: ConfirmedInterpretation.optional(),
})
export type CreateTimelineRequest = z.infer<typeof CreateTimelineRequest>

export const InterpretRequest = z.object({
  podText: z.string().min(4).max(2000),
})
export type InterpretRequest = z.infer<typeof InterpretRequest>

export const InterpretResponse = z.object({
  interpretation: PodInterpretedOut,
  model: z.string(),
  mode: z.enum(['mock', 'live']),
})
export type InterpretResponse = z.infer<typeof InterpretResponse>

export const CreateTimelineResponse = z.object({
  timeline: Timeline,
  pod: PointOfDivergence,
  rootBranch: Branch,
})
export type CreateTimelineResponse = z.infer<typeof CreateTimelineResponse>

export const ConfigResponse = z.object({
  /** Kept for compatibility; `mode` is the user-facing truth. */
  mock: z.boolean(),
  /** 'demo' = deterministic canned engine (no key); 'live' = real derivation. */
  mode: z.enum(['live', 'demo']),
  keyConfigured: z.boolean(),
  models: z.object({ generation: z.string(), critic: z.string() }),
  defaults: z.object({
    dial: Dial,
    horizonYears: z.number().int(),
    lenses: z.array(Lens),
  }),
})
export type ConfigResponse = z.infer<typeof ConfigResponse>

/** The workhorse read: one branch fully resolved for rendering. */
export const BranchView = z.object({
  timeline: Timeline,
  pod: PointOfDivergence,
  branch: Branch,
  branches: z.array(Branch),
  eras: z.array(Era),
  events: z.array(EventView),
  entities: z.array(EntityView),
  edges: z.array(CausalEdge),
  convergences: z.array(ConvergencePoint),
  artifacts: z.array(Artifact),
  biographies: z.array(EntityBiography),
  /** Court of Plausibility transcripts visible on this branch (v2/M17). */
  courtRecords: z.array(CourtRecord).default([]),
  /** Regional index readings and name drift visible on this branch (v2/M18). */
  claims: z.array(Claim).default([]),
})
export type BranchView = z.infer<typeof BranchView>

export const ImportResponse = z.object({
  timelineId: z.string(),
})
export type ImportResponse = z.infer<typeof ImportResponse>

/**
 * PATCH /timelines/:id - every field optional, at least one required.
 * The horizon may only grow (the era plan is append-only by design);
 * shrinking would orphan committed eras.
 */
export const UpdateTimelineRequest = z
  .object({
    title: z.string().min(1).max(120).optional(),
    dial: Dial.optional(),
    axes: DialAxes.nullable().optional(),
    derivation: z.enum(['standard', 'symposium']).optional(),
    court: z.boolean().optional(),
    epilogue: z.boolean().optional(),
    horizonYears: z.number().int().min(10).max(6000).optional(),
    defaultLenses: z.array(Lens).min(1).optional(),
  })
  .refine((r) => Object.values(r).some((v) => v !== undefined), 'nothing to update')
export type UpdateTimelineRequest = z.infer<typeof UpdateTimelineRequest>

export const UpdateTimelineResponse = z.object({
  timeline: Timeline,
})
export type UpdateTimelineResponse = z.infer<typeof UpdateTimelineResponse>

/** POST /branches/:branchId/events/:eventId/regenerate */
export const RegenerateEventRequest = z.object({
  /** Optional reader guidance for the fresh telling. */
  guidance: z.string().max(500).optional(),
})
export type RegenerateEventRequest = z.infer<typeof RegenerateEventRequest>

export const RegenerateEventResponse = z.object({
  event: EventView,
})
export type RegenerateEventResponse = z.infer<typeof RegenerateEventResponse>

export const ForkRequest = z.object({
  eventId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  subPodText: z.string().min(4).max(2000).optional(),
})
export type ForkRequest = z.infer<typeof ForkRequest>

export const ForkResponse = z.object({
  branch: Branch,
})
export type ForkResponse = z.infer<typeof ForkResponse>

/** One side of a comparison: a branch resolved to its spine. */
const CompareSide = z.object({
  branch: Branch,
  eras: z.array(Era),
  events: z.array(EventView),
})

export const CompareView = z.object({
  timeline: Timeline,
  pod: PointOfDivergence,
  a: CompareSide,
  /** Either another branch, or the curated record. */
  b: z.union([
    CompareSide,
    z.object({
      baseline: z.literal(true),
      anchors: z.array(BaselineAnchor),
    }),
  ]),
  /** Events visible on both sides (branch↔branch), in a's order. */
  sharedEventIds: z.array(z.string()),
  /** The last shared event - where the two lines part. */
  divergesAfterEventId: z.string().nullable(),
})
export type CompareView = z.infer<typeof CompareView>
