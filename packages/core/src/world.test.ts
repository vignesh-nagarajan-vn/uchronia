import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { IntegrityError, PreForkImmutableError } from './errors.js'
import { World } from './world.js'

function makeWorld(): World {
  return World.fromAggregate(fixtureAggregate())
}

describe('fork resolution — structural sharing', () => {
  it('resolves the root branch to its own events in order', () => {
    const world = makeWorld()
    expect(world.resolveEvents(FX.rootBranch).map((e) => e.id)).toEqual([
      FX.e0,
      FX.e1,
      FX.e2,
      FX.e3,
      FX.e4,
    ])
  })

  it('resolves a child branch to the parent prefix up to the fork, plus its own events', () => {
    const world = makeWorld()
    expect(world.resolveEvents(FX.childBranch).map((e) => e.id)).toEqual([
      FX.e0,
      FX.e1,
      FX.e2, // fork event, inclusive
      FX.e5, // child's own
    ])
  })

  it('resolves eras through the fork: inherited era0, own child era, never era1', () => {
    const world = makeWorld()
    expect(world.resolveEras(FX.childBranch).map((e) => e.id)).toEqual([FX.era0, FX.childEra])
  })

  it('resolves edges to visible pairs only', () => {
    const world = makeWorld()
    const childEdges = world.resolveEdges(FX.childBranch).map((e) => e.id)
    expect(childEdges).toContain(FX.edge01)
    expect(childEdges).toContain(FX.edge02)
    expect(childEdges).toContain(FX.edge25) // child edge from inherited e2
    expect(childEdges).not.toContain(FX.edge23) // e4 is beyond the fork cut
  })

  it('supports multi-level forks (grandchild sees grandparent prefix)', () => {
    const world = makeWorld()
    const grandchild = world.fork({
      id: '01BR00000000000000000000G3',
      viewedBranchId: FX.childBranch,
      forkEventId: FX.e5,
      name: 'third generation',
      subPod: null,
      createdAt: '2026-07-22T13:00:00.000Z',
    })
    expect(grandchild.parentBranchId).toBe(FX.childBranch)
    expect(world.resolveEvents(grandchild.id).map((e) => e.id)).toEqual([
      FX.e0,
      FX.e1,
      FX.e2,
      FX.e5,
    ])
  })

  it('normalizes the fork parent to the branch owning the fork event', () => {
    const world = makeWorld()
    // Viewed from the child, e1 is inherited from root — the fork attaches to root.
    const cousin = world.fork({
      id: '01BR00000000000000000000G4',
      viewedBranchId: FX.childBranch,
      forkEventId: FX.e1,
      name: 'earlier split',
      subPod: null,
      createdAt: '2026-07-22T13:00:00.000Z',
    })
    expect(cousin.parentBranchId).toBe(FX.rootBranch)
    expect(world.resolveEvents(cousin.id).map((e) => e.id)).toEqual([FX.e0, FX.e1])
  })

  it('refuses to fork at an event that is not visible from the viewed branch', () => {
    const world = makeWorld()
    expect(() =>
      world.fork({
        id: '01BR00000000000000000000G5',
        viewedBranchId: FX.childBranch,
        forkEventId: FX.e4, // beyond the child's cut
        name: 'impossible',
        subPod: null,
        createdAt: '2026-07-22T13:00:00.000Z',
      }),
    ).toThrow(IntegrityError)
  })
})

describe('state replay', () => {
  it('replays branch-local state to the end of the branch', () => {
    const world = makeWorld()
    const rootState = world.stateAt(FX.rootBranch)
    expect(rootState.get(FX.byzantium)).toMatchObject({
      morale: 'exultant', // e0
      treasury: 'mortgaged to Venice', // e2
      literacyTrend: 'rising in the capital', // e3
      population: 42000, // e0 overrode the initial 50000
    })
    // Entity introduced mid-history exists with initial + delta merged.
    expect(rootState.get(FX.peraPress)).toMatchObject({
      pressCount: 2,
      patron: 'Patriarchate of Constantinople',
    })
  })

  it('keeps branch states divergent', () => {
    const world = makeWorld()
    const childState = world.stateAt(FX.childBranch)
    expect(childState.get(FX.byzantium)).toMatchObject({ church: 'union enforced' }) // e5
    expect(childState.get(FX.byzantium)).not.toHaveProperty('literacyTrend') // e3 invisible
    expect(childState.has(FX.peraPress)).toBe(false) // introduced by invisible e3
    // And the root never sees the child's union.
    expect(world.stateAt(FX.rootBranch).get(FX.byzantium)).not.toHaveProperty('church')
  })

  it('replays up to and including a given event', () => {
    const world = makeWorld()
    const atLoan = world.stateAt(FX.rootBranch, FX.e2)
    expect(atLoan.get(FX.byzantium)).toMatchObject({ treasury: 'mortgaged to Venice' })
    expect(atLoan.get(FX.byzantium)).not.toHaveProperty('literacyTrend')
  })

  it('renders the dossier ledger from visible deltas', () => {
    const world = makeWorld()
    const ledger = world.changeLog(FX.rootBranch, FX.byzantium)
    expect(ledger.map((l) => l.eventId)).toEqual([FX.e0, FX.e2, FX.e3])
    expect(world.changeLog(FX.childBranch, FX.byzantium).map((l) => l.eventId)).toEqual([
      FX.e0,
      FX.e2,
      FX.e5,
    ])
  })

  it('resolves entities per branch', () => {
    const world = makeWorld()
    const childEntities = world.resolveEntities(FX.childBranch).map((e) => e.id)
    expect(childEntities).not.toContain(FX.peraPress)
    expect(world.resolveEntities(FX.rootBranch).map((e) => e.id)).toContain(FX.peraPress)
  })
})

describe('event views', () => {
  it('derives causes and effects from visible edges', () => {
    const world = makeWorld()
    const view = world.eventView(FX.rootBranch, FX.e0)
    expect(view.effects.sort()).toEqual([FX.edge01, FX.edge02].sort())
    expect(view.causes).toEqual([])
    // The same event viewed from the child picks up the child's edge.
    const childView = world.eventView(FX.childBranch, FX.e2)
    expect(childView.effects).toContain(FX.edge25)
  })
})

describe('mutation guards — pre-fork immutability and integrity', () => {
  it('rejects events appended into another branch’s era', () => {
    const world = makeWorld()
    const agg = fixtureAggregate()
    const template = agg.events[0]
    if (!template) throw new Error('fixture missing')
    expect(() =>
      world.addEvent({
        ...template,
        id: '01EV0000000000000000000099',
        branchId: FX.childBranch,
        eraId: FX.era1, // owned by root
        ordinal: 1,
      }),
    ).toThrow(PreForkImmutableError)
  })

  it('rejects out-of-sequence ordinals', () => {
    const world = makeWorld()
    const agg = fixtureAggregate()
    const template = agg.events[0]
    if (!template) throw new Error('fixture missing')
    expect(() =>
      world.addEvent({
        ...template,
        id: '01EV0000000000000000000098',
        branchId: FX.rootBranch,
        eraId: FX.era1,
        ordinal: 9, // next own ordinal is 5
      }),
    ).toThrow(IntegrityError)
  })

  it('rejects disputes and convergence marks from non-owning branches', () => {
    const world = makeWorld()
    expect(() => world.markDisputed(FX.childBranch, FX.e1, [])).toThrow(PreForkImmutableError)
    expect(() => world.markConvergence(FX.childBranch, FX.e1)).toThrow(PreForkImmutableError)
  })

  it('rejects edges claiming causes for events the branch does not own', () => {
    const world = makeWorld()
    expect(() =>
      world.addEdge({
        id: '01ED0000000000000000000099',
        branchId: FX.childBranch,
        fromEventId: FX.e0,
        toEventId: FX.e3, // owned by root
        kind: 'causes',
        strength: 0.5,
      }),
    ).toThrow(PreForkImmutableError)
  })

  it('rejects duplicate entity slugs', () => {
    const world = makeWorld()
    const agg = fixtureAggregate()
    const entity = agg.entities[0]
    if (!entity) throw new Error('fixture missing')
    expect(() => world.addEntity({ ...entity, id: '01EN0000000000000000000099' })).toThrow(
      IntegrityError,
    )
  })

  it('fills detail once and keeps the first fill', () => {
    const world = makeWorld()
    const first = world.setEventDetail(FX.e1, 'The withdrawal, at length.')
    expect(first.detail).toBe('The withdrawal, at length.')
    const second = world.setEventDetail(FX.e1, 'Different text.')
    expect(second.detail).toBe('The withdrawal, at length.')
  })
})

describe('aggregate round-trip', () => {
  it('toAggregate reproduces what fromAggregate consumed', () => {
    const original = fixtureAggregate()
    const world = World.fromAggregate(original)
    const out = world.toAggregate()
    // Map iteration order matches insertion; compare as sets by id.
    expect(new Set(out.events.map((e) => e.id))).toEqual(new Set(original.events.map((e) => e.id)))
    expect(out.timeline).toEqual(original.timeline)
    expect(out.biographies).toEqual(original.biographies)
  })
})
