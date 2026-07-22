import { z } from 'zod'
import { UlidString } from './ids.js'

export const EDGE_KINDS = ['causes', 'enables', 'prevents', 'accelerates', 'delays'] as const
export const EdgeKind = z.enum(EDGE_KINDS)
export type EdgeKind = z.infer<typeof EdgeKind>

/**
 * A directed causal claim between two events. Edges are owned by the branch
 * whose generation introduced them; both endpoints must be visible on that
 * branch (the from-side may be inherited pre-fork history).
 */
export const CausalEdge = z.object({
  id: UlidString,
  branchId: UlidString,
  fromEventId: UlidString,
  toEventId: UlidString,
  kind: EdgeKind,
  strength: z.number().min(0).max(1),
})
export type CausalEdge = z.infer<typeof CausalEdge>
