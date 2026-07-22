import { z } from 'zod'
import { Artifact } from './artifact.js'
import { Branch } from './branch.js'
import { ConvergencePoint } from './convergence.js'
import { CritiqueReport } from './critique.js'
import { CausalEdge } from './edge.js'
import { Entity, EntityBiography } from './entity.js'
import { Era } from './era.js'
import { Event } from './event.js'
import { PointOfDivergence } from './pod.js'
import { Timeline } from './timeline.js'

/**
 * A whole timeline as one document: the persistence hydration shape, the JSON
 * export/import format (F10), and the fixture format — one schema for all
 * three so they can never drift apart.
 */
export const TimelineAggregate = z.object({
  formatVersion: z.literal(1),
  timeline: Timeline,
  pod: PointOfDivergence,
  branches: z.array(Branch),
  eras: z.array(Era),
  events: z.array(Event),
  entities: z.array(Entity),
  edges: z.array(CausalEdge),
  artifacts: z.array(Artifact),
  convergencePoints: z.array(ConvergencePoint),
  critiqueReports: z.array(CritiqueReport),
  biographies: z.array(EntityBiography),
})
export type TimelineAggregate = z.infer<typeof TimelineAggregate>
