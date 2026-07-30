import type { Event } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { defaultHorizonYears, EPILOGUE_YEARS, planEraSpans } from './pipeline/plan.js'
import { indexContinuity } from './validator.js'
import { World } from './world.js'

/**
 * Lives, deep time, and the index rule (v2/M18): the pure pieces, tested
 * without a provider. Role tenures are replay-derived, so they are checked by
 * writing deltas onto a fixture world and reading them back per branch.
 */

const NOW = '2026-07-22T12:00:00.000Z'
const generated = {
  kind: 'generated',
  model: 'mock',
  templateId: 'fixture',
  templateVersion: '1.0.0',
  generatedAt: NOW,
  mode: 'mock',
} as const

function eventOn(
  world: World,
  over: Partial<Event> & { id: string; ordinal: number; year: number },
): Event {
  return {
    branchId: FX.rootBranch,
    eraId: FX.era1,
    dateLabel: String(over.year),
    title: 'A change of office',
    summary: 'The seal passes to another pair of hands, and the registers note it.',
    detail: null,
    entityIds: [FX.constantine],
    deltas: [],
    lenses: ['political'],
    plausibility: { score: 0.8, rationale: 'Offices change hands.' },
    distanceFromPod: over.year - world.pod.year,
    wildcard: false,
    flags: { disputed: false, convergence: false, contested: false },
    criticNotes: null,
    provenance: generated,
    ...over,
    date: { year: over.year, label: String(over.year) },
  } as Event
}

describe('role tenures, replayed (v2/M18)', () => {
  it('opens a span when a role is set and closes it when the next one is', () => {
    const world = World.fromAggregate(fixtureAggregate())
    const start = world.ownEvents(FX.rootBranch).length
    world.addEvent(
      eventOn(world, {
        id: '01EV000000000000000000TN01',
        ordinal: start,
        year: 1466,
        deltas: [
          {
            entityId: FX.constantine,
            patch: { role: 'emperor' },
            note: 'The purple is assumed.',
          },
        ],
      }),
    )
    world.addEvent(
      eventOn(world, {
        id: '01EV000000000000000000TN02',
        ordinal: start + 1,
        year: 1469,
        deltas: [
          {
            entityId: FX.constantine,
            patch: { role: 'regent for the minor' },
            note: 'The office is redefined around a child.',
          },
        ],
      }),
    )

    const tenures = world.roleTenures(FX.rootBranch, FX.constantine)
    expect(tenures).toHaveLength(2)
    expect(tenures[0]).toMatchObject({ role: 'emperor', startYear: 1466, endYear: 1469 })
    expect(tenures[1]).toMatchObject({
      role: 'regent for the minor',
      startYear: 1469,
      endYear: null,
    })
  })

  it('closes the open tenure when the holder is ended', () => {
    const world = World.fromAggregate(fixtureAggregate())
    const start = world.ownEvents(FX.rootBranch).length
    world.addEvent(
      eventOn(world, {
        id: '01EV000000000000000000TN03',
        ordinal: start,
        year: 1466,
        deltas: [
          { entityId: FX.constantine, patch: { role: 'emperor' }, note: 'The purple is assumed.' },
        ],
      }),
    )
    world.addEvent(
      eventOn(world, {
        id: '01EV000000000000000000TN04',
        ordinal: start + 1,
        year: 1471,
        deltas: [
          {
            entityId: FX.constantine,
            patch: { fate: 'died in the winter' },
            note: 'The office falls vacant.',
            ends: true,
          },
        ],
      }),
    )
    const tenures = world.roleTenures(FX.rootBranch, FX.constantine)
    expect(tenures).toHaveLength(1)
    expect(tenures[0]?.endYear).toBe(1471)
  })

  it('reports no tenures for an entity that never held an office', () => {
    const world = World.fromAggregate(fixtureAggregate())
    expect(world.roleTenures(FX.rootBranch, FX.byzantium)).toEqual([])
  })
})

describe('deep time (v2/M18)', () => {
  it('carries a divergence to the present by default, with a floor', () => {
    expect(defaultHorizonYears(1453, 2026)).toBe(573)
    expect(defaultHorizonYears(-3000, 2026)).toBe(5026)
    // A divergence inside living memory still gets road enough to derive on.
    expect(defaultHorizonYears(2020, 2026)).toBe(60)
    // And nothing runs past the schema's ceiling.
    expect(defaultHorizonYears(-9000, 2026)).toBe(6000)
  })

  it('keeps era spans widening past the width table instead of repeating', () => {
    const spans = planEraSpans(0, 6000)
    const widths = spans.map((s) => s.endYear - s.startYear)
    // Monotonically non-decreasing up to the final clipped span.
    for (let i = 1; i < widths.length - 1; i++) {
      expect(widths[i] ?? 0).toBeGreaterThanOrEqual(widths[i - 1] ?? 0)
    }
    // Deep time costs a bounded number of eras, not one per century.
    expect(spans.length).toBeLessThan(20)
    expect(spans.at(-1)?.endYear).toBe(6000)
    expect(spans[0]?.startYear).toBe(0)
  })

  it('leaves a short horizon exactly as it was', () => {
    const spans = planEraSpans(1453, 1573)
    expect(spans[0]).toEqual({ startYear: 1453, endYear: 1455 })
    expect(spans.at(-1)?.endYear).toBe(1573)
    expect(EPILOGUE_YEARS).toBe(50)
  })
})

describe('index continuity, rule 12 (v2/M18)', () => {
  const claimOn = (world: World, id: string, value: number, delta: number, note: string) => ({
    id,
    branchId: FX.rootBranch,
    eventId: world.ownEvents(FX.rootBranch)[0]?.id ?? '',
    year: 1460,
    body: {
      kind: 'regional-index' as const,
      region: 'Mediterranean' as const,
      index: 'population' as const,
      value,
      delta,
      note,
    },
    provenance: generated,
  })

  it('passes a walk that reports its own arithmetic honestly', () => {
    const world = World.fromAggregate(fixtureAggregate())
    world.addClaim(claimOn(world, '01CM000000000000000000IX01', 50, 0, 'The parish rolls hold.'))
    world.addClaim(claimOn(world, '01CM000000000000000000IX02', 56, 6, 'A settled generation.'))
    expect(indexContinuity(world, FX.rootBranch)).toEqual([])
  })

  it('catches a claim that understates the jump it is making', () => {
    const world = World.fromAggregate(fixtureAggregate())
    world.addClaim(claimOn(world, '01CM000000000000000000IX03', 50, 0, 'The parish rolls hold.'))
    world.addClaim(claimOn(world, '01CM000000000000000000IX04', 80, 2, 'A settled generation.'))
    const issues = indexContinuity(world, FX.rootBranch)
    expect(issues).toHaveLength(2)
    expect(issues[0]?.message).toContain('reports delta 2 but moved from 50 to 80')
  })

  it('allows a big move when the note names a catastrophe, and refuses it otherwise', () => {
    const bland = World.fromAggregate(fixtureAggregate())
    bland.addClaim(claimOn(bland, '01CM000000000000000000IX05', 50, 0, 'The rolls hold.'))
    bland.addClaim(claimOn(bland, '01CM000000000000000000IX06', 20, -30, 'Things got worse.'))
    expect(indexContinuity(bland, FX.rootBranch)).toHaveLength(1)

    const explained = World.fromAggregate(fixtureAggregate())
    explained.addClaim(claimOn(explained, '01CM000000000000000000IX07', 50, 0, 'The rolls hold.'))
    explained.addClaim(
      claimOn(
        explained,
        '01CM000000000000000000IX08',
        20,
        -30,
        'Plague empties the quarters faster than the registers can record it.',
      ),
    )
    expect(indexContinuity(explained, FX.rootBranch)).toEqual([])
  })
})
