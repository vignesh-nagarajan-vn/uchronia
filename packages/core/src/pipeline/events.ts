import type {
  CausalEdge,
  ConvergencePoint,
  CritiqueReport,
  Entity,
  Era,
  Event,
} from '@uchronia/schemas'

/**
 * What a generation run emits, in order. The server persists each mutation
 * event and forwards everything down the SSE stream; the client inks events
 * into the ledger as they arrive (§4.8).
 */
export type PipelineEvent =
  | { type: 'run.started'; branchId: string }
  | { type: 'era.started'; era: Era }
  | { type: 'entity.created'; entity: Entity }
  /** Disputed events arrive here too — flags.disputed + criticNotes already set. */
  | { type: 'event.accepted'; event: Event; edges: CausalEdge[] }
  | { type: 'critique.completed'; report: CritiqueReport }
  | { type: 'convergence.found'; point: ConvergencePoint; eventId: string }
  | { type: 'era.completed'; era: Era }
  | { type: 'warning'; message: string }
  /** usage is attached by the server from its per-run accounting. */
  | {
      type: 'run.completed'
      branchId: string
      usage?: { inputTokens: number; outputTokens: number }
    }

export type PipelineEventType = PipelineEvent['type']
