import type { Branch, PointOfDivergence, Pressure, Timeline } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { validateBranch } from '../validator.js'
import { World } from '../world.js'
import type { PipelineCtx } from './ctx.js'
import type { PipelineEvent } from './events.js'
import { runGeneration } from './run.js'
import { chooseSpecialists, SYMPOSIUM_CHAIRS } from './symposium.js'

const NOW = '2026-07-22T12:00:00.000Z'

const pressure = (kind: Pressure['kind'], intensity: number): Pressure => ({
  name: `${kind} strain`,
  kind,
  description: 'A tension invented for the chair-selection tests.',
  intensity,
})

function symposiumWorld(): { world: World; branchId: string } {
  const idgen = sequentialIdGen('SY')
  const timelineId = idgen.next()
  const timeline: Timeline = {
    id: timelineId,
    title: 'The Contested Record',
    createdAt: NOW,
    settings: {
      dial: 50,
      derivation: 'symposium',
      court: false,
      epilogue: false,
      horizonYears: 60,
      defaultLenses: ['political', 'economic'],
      models: { generation: 'mock', critic: 'mock', mode: 'mock' },
    },
  }
  const pod: PointOfDivergence = {
    id: idgen.next(),
    timelineId,
    raw: 'What if the Library of Alexandria never burned in 48 BC?',
    statement: 'The Library of Alexandria never burns in 48 BC.',
    year: -48,
    dateLabel: '48 BC',
    region: 'Mediterranean',
    mechanism: 'knowledge',
    baselineContext: 'Part of the library burned during Caesar’s Alexandrian war.',
    provenance: { kind: 'user' },
  }
  const branch: Branch = {
    id: idgen.next(),
    timelineId,
    parentBranchId: null,
    forkEventId: null,
    subPod: null,
    name: 'main line',
    createdAt: NOW,
  }
  const world = new World(timeline, pod)
  world.addBranch(branch)
  return { world, branchId: branch.id }
}

async function collect(gen: AsyncGenerator<PipelineEvent>): Promise<PipelineEvent[]> {
  const out: PipelineEvent[] = []
  for await (const ev of gen) out.push(ev)
  return out
}

describe('chooseSpecialists (v2/M17)', () => {
  it('seats the chairs the era’s own pressures call for', () => {
    const chairs = chooseSpecialists([
      pressure('economic', 0.9),
      pressure('technological', 0.8),
      pressure('ideological', 0.2),
    ])
    expect(chairs).toHaveLength(SYMPOSIUM_CHAIRS)
    expect(chairs).toContain('economic')
    expect(chairs).toContain('technological')
  })

  it('lends weight to the military chair when a pressure presses hard', () => {
    const calm = chooseSpecialists([
      pressure('demographic', 0.4),
      pressure('economic', 0.35),
      pressure('ideological', 0.3),
    ])
    const urgent = chooseSpecialists([
      pressure('demographic', 0.9),
      pressure('economic', 0.9),
      pressure('ideological', 0.9),
    ])
    expect(calm).not.toContain('military')
    expect(urgent).toContain('military')
  })

  it('is deterministic and never seats the same chair twice', () => {
    const input = [pressure('economic', 0.5), pressure('environmental', 0.5)]
    const a = chooseSpecialists(input)
    const b = chooseSpecialists(input)
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(a.length)
  })

  it('still seats a full bench when there are no pressures at all', () => {
    expect(chooseSpecialists([])).toHaveLength(SYMPOSIUM_CHAIRS)
  })
})

describe('symposium derivation end to end (mock)', () => {
  it('derives a valid branch and marks what the chairs could not settle', async () => {
    const { world, branchId } = symposiumWorld()
    const ctx: PipelineCtx = {
      provider: new MockProvider(),
      idgen: sequentialIdGen('SR'),
      clock: fixedClock(NOW),
    }
    const stream = await collect(runGeneration(ctx, world, branchId))

    expect(stream.at(-1)).toEqual({ type: 'run.completed', branchId })
    expect(validateBranch(world, branchId)).toEqual([])

    // The bench is announced for every era past the seed.
    const seated = stream.filter(
      (e) => e.type === 'warning' && e.message.includes('the symposium sat'),
    )
    expect(seated.length).toBeGreaterThanOrEqual(1)

    // Disagreements survive as contested marks with the marginalia attached.
    const events = world.resolveEvents(branchId)
    const contested = events.filter((e) => e.flags.contested)
    expect(contested.length).toBeGreaterThanOrEqual(1)
    for (const event of contested) {
      expect(event.criticNotes?.some((n) => n.type === 'contested')).toBe(true)
    }
  })

  it('leaves standard derivation with no contested marks at all', async () => {
    const { world, branchId } = symposiumWorld()
    const standard = new World(
      { ...world.timeline, settings: { ...world.timeline.settings, derivation: 'standard' } },
      world.pod,
    )
    standard.addBranch(world.getBranch(branchId))
    const ctx: PipelineCtx = {
      provider: new MockProvider(),
      idgen: sequentialIdGen('SS'),
      clock: fixedClock(NOW),
    }
    await collect(runGeneration(ctx, standard, branchId))
    expect(standard.resolveEvents(branchId).every((e) => !e.flags.contested)).toBe(true)
  })
})
