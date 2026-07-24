import type { TimelineAggregate } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import {
  datesMonotonicWithinEra,
  deltasApplyCleanly,
  edgeEndpointsExist,
  entitiesExist,
  eraRangesNonOverlapping,
  eventWithinEra,
  forkNormalized,
  noPosthumousMutation,
  plausibilityInRange,
  validateBranch,
  validateWorld,
} from './validator.js'
import { World } from './world.js'

function worldWith(mutate: (agg: TimelineAggregate) => void): World {
  const agg = fixtureAggregate()
  mutate(agg)
  return World.fromAggregate(agg)
}

function event(agg: TimelineAggregate, id: string) {
  const e = agg.events.find((x) => x.id === id)
  if (!e) throw new Error(`fixture event missing: ${id}`)
  return e
}

describe('validator — clean world', () => {
  it('finds no issues in the fixture world, on any branch', () => {
    const world = World.fromAggregate(fixtureAggregate())
    expect(validateWorld(world)).toEqual([])
  })
})

describe('rule: dates-monotonic', () => {
  it('flags an event dated before its era predecessor', () => {
    const world = worldWith((agg) => {
      event(agg, FX.e1).date.year = 1452 // before e0's 1453, same era
    })
    const issues = datesMonotonicWithinEra(world, FX.rootBranch)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.rule).toBe('dates-monotonic')
    expect(issues[0]?.eventId).toBe(FX.e1)
  })

  it('does not compare across eras', () => {
    // e3 (era1, 1457) after e2 (era0, 1454) — different eras, no comparison.
    const world = World.fromAggregate(fixtureAggregate())
    expect(datesMonotonicWithinEra(world, FX.rootBranch)).toEqual([])
  })
})

describe('rule: event-within-era', () => {
  it('flags events outside their era range', () => {
    const world = worldWith((agg) => {
      event(agg, FX.e1).date.year = 1470 // era0 ends 1455
    })
    const issues = eventWithinEra(world, FX.rootBranch)
    expect(issues.map((i) => i.eventId)).toEqual([FX.e1])
  })
})

describe('rule: edge-endpoints-exist', () => {
  it('flags edges pointing at missing events', () => {
    const world = worldWith((agg) => {
      const edge = agg.edges.find((e) => e.id === FX.edge01)
      if (!edge) throw new Error('fixture edge missing')
      edge.toEventId = '01EV00000000000000000000ZZ'
    })
    const issues = edgeEndpointsExist(world, FX.rootBranch)
    expect(issues.some((i) => i.edgeId === FX.edge01)).toBe(true)
  })

  it('flags own edges referencing events invisible from the owning branch', () => {
    const world = worldWith((agg) => {
      // Child claims an edge onto its own event from root's post-fork e4.
      agg.edges.push({
        id: '01ED0000000000000000000077',
        branchId: FX.childBranch,
        fromEventId: FX.e4,
        toEventId: FX.e5,
        kind: 'causes',
        strength: 0.4,
      })
    })
    const issues = edgeEndpointsExist(world, FX.childBranch)
    expect(issues.some((i) => i.edgeId === '01ED0000000000000000000077')).toBe(true)
  })
})

describe('rule: entities-exist', () => {
  it('flags unknown entity references in entityIds and deltas', () => {
    const ghost = '01EN00000000000000000000ZZ'
    const world = worldWith((agg) => {
      event(agg, FX.e1).entityIds.push(ghost)
      event(agg, FX.e1).deltas.push({
        entityId: ghost,
        patch: { note: 'boo' },
        note: 'a ghost walks',
      })
    })
    const issues = entitiesExist(world, FX.rootBranch)
    expect(issues).toHaveLength(2)
  })
})

describe('rule: deltas-apply', () => {
  it('flags deltas that mutate an entity before its introduction', () => {
    const world = worldWith((agg) => {
      // e2 (ordinal 2) mutates the press, which is introduced by e3 (ordinal 3).
      event(agg, FX.e2).deltas.push({
        entityId: FX.peraPress,
        patch: { pressCount: 5 },
        note: 'premature',
      })
    })
    const issues = deltasApplyCleanly(world, FX.rootBranch)
    expect(issues.map((i) => i.eventId)).toEqual([FX.e2])
  })

  it('flags deltas on a child branch whose target is introduced on an invisible segment', () => {
    const world = worldWith((agg) => {
      // e5 (child) mutates the press — introduced by e3, invisible to the child.
      event(agg, FX.e5).deltas.push({
        entityId: FX.peraPress,
        patch: { pressCount: 9 },
        note: 'phantom press',
      })
    })
    const issues = deltasApplyCleanly(world, FX.childBranch)
    expect(issues.map((i) => i.eventId)).toEqual([FX.e5])
  })
})

describe('rule: no-posthumous-mutation', () => {
  it('flags deltas on an entity after its terminal delta', () => {
    const world = worldWith((agg) => {
      const terminal = event(agg, FX.e0).deltas.find((d) => d.entityId === FX.ottomans)
      if (!terminal) throw new Error('fixture delta missing')
      terminal.ends = true
    })
    const issues = noPosthumousMutation(world, FX.rootBranch)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((i) => i.rule === 'no-posthumous-mutation')).toBe(true)
    expect(issues.some((i) => i.eventId === FX.e1)).toBe(true)
  })

  it('allows further deltas within the ending event itself', () => {
    const world = worldWith((agg) => {
      // The LAST delta of the last root event ends the entity — nothing follows.
      const last = agg.events
        .filter((e) => e.branchId === FX.rootBranch)
        .sort((a, b) => a.ordinal - b.ordinal)
        .at(-1)
      if (!last) throw new Error('no root events')
      const target = last.deltas[0]
      if (!target) throw new Error('no delta to end with')
      target.ends = true
    })
    expect(noPosthumousMutation(world, FX.rootBranch)).toEqual([])
  })

  it('keeps death branch-local: a sibling that cannot see the ending sees no issue', () => {
    const world = worldWith((agg) => {
      // e4 is a post-fork root event, invisible to the child branch.
      event(agg, FX.e4).deltas.push({
        entityId: FX.ottomans,
        patch: { status: 'dissolved' },
        note: 'the sultanate dissolves',
        ends: true,
      })
      // The child keeps mutating the same entity on its own segment.
      event(agg, FX.e5).deltas.push({
        entityId: FX.ottomans,
        patch: { status: 'reforming' },
        note: 'reform continues in this line',
      })
    })
    expect(noPosthumousMutation(world, FX.childBranch)).toEqual([])
    expect(noPosthumousMutation(world, FX.rootBranch)).toEqual([])
  })
})

describe('rule: plausibility-range', () => {
  it('flags out-of-range scores', () => {
    const world = worldWith((agg) => {
      event(agg, FX.e0).plausibility.score = 1.7
    })
    const issues = plausibilityInRange(world, FX.rootBranch)
    expect(issues.map((i) => i.eventId)).toEqual([FX.e0])
  })
})

describe('rule: era-overlap', () => {
  it('flags overlapping own eras', () => {
    const world = worldWith((agg) => {
      const era1 = agg.eras.find((e) => e.id === FX.era1)
      if (!era1) throw new Error('fixture era missing')
      era1.startYear = 1454 // era0 runs to 1455
    })
    const issues = eraRangesNonOverlapping(world, FX.rootBranch)
    expect(issues.map((i) => i.eraId)).toEqual([FX.era1])
  })

  it('flags inverted ranges', () => {
    const world = worldWith((agg) => {
      const era = agg.eras.find((e) => e.id === FX.childEra)
      if (!era) throw new Error('fixture era missing')
      era.endYear = era.startYear - 10
    })
    const issues = eraRangesNonOverlapping(world, FX.childBranch)
    expect(issues.map((i) => i.eraId)).toEqual([FX.childEra])
  })
})

describe('rule: fork-normalized', () => {
  it('flags forks whose stored parent does not own the fork event', () => {
    const world = worldWith((agg) => {
      const child = agg.branches.find((b) => b.id === FX.childBranch)
      if (!child) throw new Error('fixture branch missing')
      child.forkEventId = FX.e5 // owned by the child itself — nonsense
    })
    const issues = forkNormalized(world, FX.childBranch)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.rule).toBe('fork-normalized')
  })

  it('short-circuits validateBranch when the chain is unresolvable', () => {
    const world = worldWith((agg) => {
      const child = agg.branches.find((b) => b.id === FX.childBranch)
      if (!child) throw new Error('fixture branch missing')
      child.forkEventId = null
    })
    const issues = validateBranch(world, FX.childBranch)
    expect(issues).toHaveLength(1)
    expect(issues[0]?.rule).toBe('fork-normalized')
  })
})
