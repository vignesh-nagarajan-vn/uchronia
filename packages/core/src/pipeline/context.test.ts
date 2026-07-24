import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { World } from '../world.js'
import { summarizeRecentEvents, summarizeState } from './context.js'

describe('summarizeState', () => {
  it('lists every living entity when under budget', () => {
    const world = World.fromAggregate(fixtureAggregate())
    const summary = summarizeState(world, FX.rootBranch)
    for (const entity of world.resolveEntities(FX.rootBranch)) {
      expect(summary).toContain(entity.slug)
    }
    expect(summary).not.toContain('withheld')
  })

  it('withholds the coldest entities beyond maxEntities, with a count', () => {
    const world = World.fromAggregate(fixtureAggregate())
    const living = world.resolveEntities(FX.rootBranch).length
    const summary = summarizeState(world, FX.rootBranch, { maxEntities: 1 })
    expect(summary).toContain(`(${living - 1} quieter entities withheld`)
  })

  it('keeps the most recently written facts and counts the dropped ones', () => {
    const world = World.fromAggregate(fixtureAggregate())
    const summary = summarizeState(world, FX.rootBranch, { maxFactsPerEntity: 1 })
    expect(summary).toContain('older facts)')
  })

  it('moves ended entities to the terminal line', () => {
    const agg = fixtureAggregate()
    const last = agg.events
      .filter((e) => e.branchId === FX.rootBranch)
      .sort((a, b) => a.ordinal - b.ordinal)
      .at(-1)
    const delta = last?.deltas[0]
    if (!delta) throw new Error('fixture needs a delta')
    delta.ends = true
    const world = World.fromAggregate(agg)
    const summary = summarizeState(world, FX.rootBranch)
    expect(summary).toContain('no longer extant')
  })
})

describe('summarizeRecentEvents', () => {
  it('marks each event with its causal parents', () => {
    const world = World.fromAggregate(fixtureAggregate())
    const summary = summarizeRecentEvents(world, FX.rootBranch)
    expect(summary).toMatch(/\[from e\d+/)
  })
})
