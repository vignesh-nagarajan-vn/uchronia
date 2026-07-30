import type { CausalEdge, Event } from '@uchronia/schemas'
import type { World } from '../world.js'

/**
 * The machine-checkable half of the relevance guard (v2/M14): an era has
 * drifted into generic period content when none of its events can trace a
 * cause chain back to the divergence. Roots are the seed era's events (era
 * ordinal 0 on the root branch); hops count cause edges walked backward.
 */
export interface PodReachability {
  connected: boolean
  /** Fewest cause-edge hops from any batch event back to a seed event; null when none connect. */
  minHops: number | null
}

/**
 * A healthy chain grows roughly one hop per era, so the bound is generous:
 * its job is to catch free-floating eras (minHops null) and absurdly loose
 * ones, not to punish long histories for being long.
 */
export function batchReachesPod(
  world: World,
  branchId: string,
  batch: { events: readonly Event[]; edges: readonly CausalEdge[] },
  maxHops = 24,
): PodReachability {
  const visibleEvents = world.resolveEvents(branchId)
  const visibleEdges = world.resolveEdges(branchId)

  const seedEraIds = new Set(
    world
      .resolveEras(branchId)
      .filter((era) => era.ordinal === 0)
      .map((era) => era.id),
  )

  // hops[eventId] = fewest cause-edge steps back to a seed event (0 for seeds).
  const hops = new Map<string, number>()
  const allEvents = [...visibleEvents, ...batch.events]
  for (const event of allEvents) {
    if (seedEraIds.has(event.eraId)) hops.set(event.id, 0)
  }

  const incoming = new Map<string, string[]>() // toEventId -> fromEventIds
  for (const edge of [...visibleEdges, ...batch.edges]) {
    incoming.set(edge.toEventId, [...(incoming.get(edge.toEventId) ?? []), edge.fromEventId])
  }

  // Relax until stable: the graph is small and edges may cite within-batch
  // events in either direction, so a fixed pass order is not enough.
  let changed = true
  while (changed) {
    changed = false
    for (const event of allEvents) {
      const parents = incoming.get(event.id) ?? []
      for (const parent of parents) {
        const parentHops = hops.get(parent)
        if (parentHops === undefined) continue
        const candidate = parentHops + 1
        const current = hops.get(event.id)
        if (current === undefined || candidate < current) {
          hops.set(event.id, candidate)
          changed = true
        }
      }
    }
  }

  let minHops: number | null = null
  for (const event of batch.events) {
    const h = hops.get(event.id)
    if (h !== undefined && (minHops === null || h < minHops)) minHops = h
  }
  return { connected: minHops !== null && minHops <= maxHops, minHops }
}
