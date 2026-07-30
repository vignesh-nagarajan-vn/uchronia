import type { Event } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import {
  demographicPlausibility,
  effectiveTechFloor,
  geographicAdvisories,
  techPrerequisites,
} from './validator.js'
import { World } from './world.js'

function makeWorld(): World {
  return World.fromAggregate(fixtureAggregate())
}

function cloneEvent(world: World, id: string, overrides: Partial<Event>): Event {
  const template = world.resolveEvents(FX.rootBranch).at(-1)
  if (!template) throw new Error('fixture has no events')
  return { ...template, id, ordinal: template.ordinal + 1, deltas: [], ...overrides }
}

describe('tech-prerequisite rule (v2/M15)', () => {
  it('resolves effective floors over the DAG', () => {
    expect(effectiveTechFloor('paper')).toBe(-250)
    // radio's own window already dominates its prerequisite (electricity 1600)
    expect(effectiveTechFloor('radio')).toBe(1820)
    // spaceflight inherits radio (1820) but its own 1900 dominates
    expect(effectiveTechFloor('spaceflight')).toBe(1900)
    // television: own 1870 beats radio's 1820
    expect(effectiveTechFloor('television')).toBe(1870)
    expect(effectiveTechFloor('no-such-tag')).toBe(Number.NEGATIVE_INFINITY)
  })

  it('flags a radio broadcast in the fifteenth century', () => {
    const world = makeWorld()
    world.addEvent(
      cloneEvent(world, '01EV000000000000000TECH001', {
        title: 'A radio broadcast from the palace',
        summary: 'The court inaugurates a wireless broadcast to the provinces.',
        date: { year: 1460, label: '1460' },
      }),
    )
    const issues = techPrerequisites(world, FX.rootBranch)
    expect(issues.some((i) => i.rule === 'tech-prerequisite' && i.message.includes('radio'))).toBe(
      true,
    )
  })

  it('accepts accelerated-but-plausible technology', () => {
    const world = makeWorld()
    world.addEvent(
      cloneEvent(world, '01EV000000000000000TECH002', {
        title: 'The penicillin wards open early',
        summary: 'Antibiotic treatment arrives decades ahead of the old record.',
        date: { year: 1875, label: '1875' },
      }),
    )
    expect(techPrerequisites(world, FX.rootBranch)).toEqual([])
  })
})

describe('demographic-plausibility rule (v2/M15)', () => {
  it('flags a person active longer than any human life', () => {
    const world = makeWorld()
    world.addEvent(
      cloneEvent(world, '01EV000000000000000DEMO001', {
        title: 'The emperor arbitrates once more',
        summary: 'The same sovereign, still ruling.',
        date: { year: 1600, label: '1600' },
        entityIds: [FX.constantine],
      }),
    )
    const issues = demographicPlausibility(world, FX.rootBranch)
    expect(
      issues.some(
        (i) => i.rule === 'demographic-plausibility' && i.message.includes('constantine'),
      ),
    ).toBe(true)
  })

  it('accepts a person within a long but human span', () => {
    const world = makeWorld()
    world.addEvent(
      cloneEvent(world, '01EV000000000000000DEMO002', {
        title: 'The emperor in old age',
        summary: 'Final acts of a long reign.',
        date: { year: 1500, label: '1500' },
        entityIds: [FX.constantine],
      }),
    )
    expect(demographicPlausibility(world, FX.rootBranch)).toEqual([])
  })
})

describe('geographic advisory (v2/M15) - warns, never drops', () => {
  it('flags the same actor in far theatres within a year, pre-telegraph', () => {
    const world = makeWorld()
    world.addEvent(
      cloneEvent(world, '01EV000000000000000GEO0001', {
        title: 'An audience in Constantinople',
        summary: 'The emperor receives envoys in Constantinople.',
        date: { year: 1470, label: '1470' },
        entityIds: [FX.constantine],
      }),
    )
    const batchEvent = cloneEvent(world, '01EV000000000000000GEO0002', {
      title: 'A landing at Nanjing',
      summary: 'The same sovereign appears at the Ming court in China.',
      date: { year: 1470, label: 'later 1470' },
      entityIds: [FX.constantine],
    })
    const issues = geographicAdvisories(world, FX.rootBranch, [batchEvent])
    expect(issues).toHaveLength(1)
    expect(issues[0]?.rule).toBe('geographic-plausibility')
  })

  it('stays silent for adjacent theatres and for slow travel', () => {
    const world = makeWorld()
    world.addEvent(
      cloneEvent(world, '01EV000000000000000GEO0003', {
        title: 'An audience in Constantinople',
        summary: 'The emperor holds court in Constantinople.',
        date: { year: 1470, label: '1470' },
        entityIds: [FX.constantine],
      }),
    )
    // Adjacent theatre (Mediterranean -> Europe): fine.
    const adjacent = cloneEvent(world, '01EV000000000000000GEO0004', {
      title: 'A mission to Vienna',
      summary: 'Envoys reach the European courts.',
      date: { year: 1470, label: '1470' },
      entityIds: [FX.constantine],
    })
    // Far theatre but three years later: travel time makes it plausible.
    const slow = cloneEvent(world, '01EV000000000000000GEO0005', {
      title: 'A landing at Nanjing',
      summary: 'After a long voyage the mission reaches China.',
      date: { year: 1473, label: '1473' },
      entityIds: [FX.constantine],
    })
    expect(geographicAdvisories(world, FX.rootBranch, [adjacent])).toEqual([])
    expect(geographicAdvisories(world, FX.rootBranch, [slow])).toEqual([])
  })
})
