import type { Era } from '@uchronia/schemas'
import { type ValidationIssue, validateBranch } from '../validator.js'
import { World } from '../world.js'
import type { ResolvedBatch } from './drafts.js'

/**
 * Trial-apply a resolved batch on a clone of the world and run the machine
 * validator. Returns the issues attributable to the batch — the real world is
 * untouched until the caller commits.
 */
export function validateBatchOnClone(
  world: World,
  branchId: string,
  era: Era,
  batch: ResolvedBatch,
): ValidationIssue[] {
  const clone = World.fromAggregate(world.toAggregate())
  const preexisting = new Set(validateBranch(clone, branchId).map((i) => i.message))
  if (!clone.ownEras(branchId).some((e) => e.id === era.id)) clone.addEra(era)
  for (const entity of batch.newEntities) clone.addEntity(entity)
  for (const event of batch.events) clone.addEvent(event)
  for (const edge of batch.edges) clone.addEdge(edge)
  return validateBranch(clone, branchId).filter((issue) => !preexisting.has(issue.message))
}
