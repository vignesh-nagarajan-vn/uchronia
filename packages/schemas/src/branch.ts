import { z } from 'zod'
import { UlidString } from './ids.js'

/** A sub-POD applied when forking mid-history ("what if she had died here?"). */
export const SubPod = z.object({
  raw: z.string().min(1),
  statement: z.string().min(1),
})
export type SubPod = z.infer<typeof SubPod>

/**
 * Branches share structure: a fork stores a parent pointer and the fork event,
 * never a copy. `parentBranchId` is normalized to the branch that *owns* the
 * fork event (which may be an ancestor of the branch the user was viewing —
 * the fork event always sits on the segment that owns it). Pre-fork history is
 * immutable from the child's perspective.
 */
export const Branch = z.object({
  id: UlidString,
  timelineId: UlidString,
  parentBranchId: UlidString.nullable(),
  forkEventId: UlidString.nullable(),
  subPod: SubPod.nullable(),
  name: z.string().min(1),
  createdAt: z.iso.datetime(),
})
export type Branch = z.infer<typeof Branch>
