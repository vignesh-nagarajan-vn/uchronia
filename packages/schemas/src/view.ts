import { z } from 'zod'
import { Artifact } from './artifact.js'
import { Branch } from './branch.js'
import { BaselineAnchor, ConvergencePoint } from './convergence.js'
import { CausalEdge } from './edge.js'
import { EntityBiography, EntityView } from './entity.js'
import { Era } from './era.js'
import { EventView } from './event.js'
import { Lens } from './lens.js'
import { PointOfDivergence } from './pod.js'
import { Dial, Timeline, TimelineSettings } from './timeline.js'

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

export const CreateTimelineRequest = z.object({
  podText: z.string().min(4).max(2000),
  title: z.string().min(1).max(120).optional(),
  dial: Dial.optional(),
  horizonYears: z.number().int().min(10).max(3000).optional(),
  lenses: z.array(Lens).min(1).optional(),
})
export type CreateTimelineRequest = z.infer<typeof CreateTimelineRequest>

export const CreateTimelineResponse = z.object({
  timeline: Timeline,
  pod: PointOfDivergence,
  rootBranch: Branch,
})
export type CreateTimelineResponse = z.infer<typeof CreateTimelineResponse>

export const ConfigResponse = z.object({
  mock: z.boolean(),
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
    horizonYears: z.number().int().min(10).max(3000).optional(),
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
