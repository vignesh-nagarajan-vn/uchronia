import type { CausalEdge, Event } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { World } from '../world.js'
import { batchReachesPod } from './relevance.js'

function makeWorld(): World {
  return World.fromAggregate(fixtureAggregate())
}

// A fabricated non-seed era id: clones must not inherit the seed era, or the
// reachability check would count them as roots themselves.
const TEST_ERA = '01ER0000000000000000TESTV2'

function cloneEvent(world: World, id: string, overrides: Partial<Event>): Event {
  const template = world.resolveEvents(FX.rootBranch)[0]
  if (!template) throw new Error('fixture has no events')
  return { ...template, id, eraId: TEST_ERA, ...overrides }
}

function edge(world: World, id: string, from: string, to: string): CausalEdge {
  const template = world.resolveEdges(FX.rootBranch)[0]
  if (!template) throw new Error('fixture has no edges')
  return { ...template, id, fromEventId: from, toEventId: to }
}

describe('batchReachesPod (v2/M14) - the machine half of the relevance guard', () => {
  it('connects a batch whose chain reaches a seed event', () => {
    const world = makeWorld()
    const seedEra = world.resolveEras(FX.rootBranch).find((e) => e.ordinal === 0)
    if (!seedEra) throw new Error('fixture has no seed era')
    const seedEvent = world.resolveEvents(FX.rootBranch).find((e) => e.eraId === seedEra.id)
    if (!seedEvent) throw new Error('fixture has no seed events')

    const a = cloneEvent(world, '01EV00000000000000000RE7A0', {})
    const b = cloneEvent(world, '01EV00000000000000000RE7B0', {})
    const batch = {
      events: [a, b],
      edges: [
        edge(world, '01ED00000000000000000RE7A0', seedEvent.id, a.id),
        edge(world, '01ED00000000000000000RE7B0', a.id, b.id),
      ],
    }
    const reach = batchReachesPod(world, FX.rootBranch, batch)
    expect(reach.connected).toBe(true)
    expect(reach.minHops).toBe(1)
  })

  it('flags a free-floating batch as drift', () => {
    const world = makeWorld()
    const a = cloneEvent(world, '01EV00000000000000000RE7C0', {})
    const reach = batchReachesPod(world, FX.rootBranch, { events: [a], edges: [] })
    expect(reach.connected).toBe(false)
    expect(reach.minHops).toBeNull()
  })

  it('resolves within-batch chains regardless of edge order', () => {
    const world = makeWorld()
    const seedEra = world.resolveEras(FX.rootBranch).find((e) => e.ordinal === 0)
    const seedEvent = world.resolveEvents(FX.rootBranch).find((e) => e.eraId === seedEra?.id)
    if (!seedEvent) throw new Error('fixture has no seed events')
    const a = cloneEvent(world, '01EV00000000000000000RE7D0', {})
    const b = cloneEvent(world, '01EV00000000000000000RE7E0', {})
    // Edges listed child-first: only iterative relaxation finds the chain.
    const batch = {
      events: [b, a],
      edges: [
        edge(world, '01ED00000000000000000RE7D0', a.id, b.id),
        edge(world, '01ED00000000000000000RE7E0', seedEvent.id, a.id),
      ],
    }
    const reach = batchReachesPod(world, FX.rootBranch, batch)
    expect(reach.connected).toBe(true)
    expect(reach.minHops).toBe(1)
  })

  it('honors the hop bound', () => {
    const world = makeWorld()
    const seedEra = world.resolveEras(FX.rootBranch).find((e) => e.ordinal === 0)
    const seedEvent = world.resolveEvents(FX.rootBranch).find((e) => e.eraId === seedEra?.id)
    if (!seedEvent) throw new Error('fixture has no seed events')
    const a = cloneEvent(world, '01EV00000000000000000RE7F0', {})
    const batch = {
      events: [a],
      edges: [edge(world, '01ED00000000000000000RE7F0', seedEvent.id, a.id)],
    }
    expect(batchReachesPod(world, FX.rootBranch, batch, 0).connected).toBe(false)
    expect(batchReachesPod(world, FX.rootBranch, batch, 1).connected).toBe(true)
  })
})
