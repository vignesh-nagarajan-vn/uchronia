import type { Branch, PointOfDivergence, Timeline } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { validateBranch } from '../validator.js'
import { World } from '../world.js'
import type { PipelineCtx } from './ctx.js'
import type { PipelineEvent } from './events.js'
import { runGeneration } from './run.js'

const NOW = '2026-07-22T12:00:00.000Z'

function freshWorld(): { world: World; branchId: string } {
  const idgen = sequentialIdGen('FW')
  const timelineId = idgen.next()
  const timeline: Timeline = {
    id: timelineId,
    title: 'The Unburnt Archive',
    createdAt: NOW,
    settings: {
      dial: 45,
      horizonYears: 150,
      defaultLenses: ['political', 'cultural'],
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
    baselineContext:
      'During Caesar’s Alexandrian war, fire spread from the docks and part of the library’s holdings burned.',
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

function ctx(): PipelineCtx {
  return { provider: new MockProvider(), idgen: sequentialIdGen('RG'), clock: fixedClock(NOW) }
}

async function collect(gen: AsyncGenerator<PipelineEvent>): Promise<PipelineEvent[]> {
  const out: PipelineEvent[] = []
  for await (const ev of gen) out.push(ev)
  return out
}

describe('runGeneration — seed stage (mock)', () => {
  it('seeds a fresh root branch with a disciplined first era', async () => {
    const { world, branchId } = freshWorld()
    const events = await collect(runGeneration(ctx(), world, branchId))

    expect(events[0]).toEqual({ type: 'run.started', branchId })
    expect(events.at(-1)).toEqual({ type: 'run.completed', branchId })

    const accepted = events.filter((e) => e.type === 'event.accepted')
    expect(accepted.length).toBeGreaterThanOrEqual(3)
    const created = events.filter((e) => e.type === 'entity.created')
    expect(created.length).toBeGreaterThanOrEqual(3)

    // The world was mutated in step with the stream.
    const resolved = world.resolveEvents(branchId)
    expect(resolved).toHaveLength(accepted.length)
    expect(world.resolveEras(branchId)).toHaveLength(1)

    // Seed discipline: high confidence, no wildcards, within two years.
    for (const event of resolved) {
      expect(event.wildcard).toBe(false)
      expect(event.plausibility.score).toBeGreaterThanOrEqual(0.6)
      expect(event.distanceFromPod).toBeLessThanOrEqual(2)
      expect(event.deltas.length).toBeGreaterThanOrEqual(1)
      expect(event.provenance).toMatchObject({ kind: 'generated', mode: 'mock' })
    }

    // P6: the batch spans registers beyond the political.
    const lenses = new Set(resolved.flatMap((e) => e.lenses))
    expect(lenses.has('economic') || lenses.has('daily-life')).toBe(true)

    // Causal edges exist and the machine validator is satisfied.
    expect(world.resolveEdges(branchId).length).toBeGreaterThanOrEqual(2)
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('is deterministic end to end for identical inputs', async () => {
    const a = freshWorld()
    const b = freshWorld()
    await collect(runGeneration(ctx(), a.world, a.branchId))
    await collect(runGeneration(ctx(), b.world, b.branchId))
    expect(a.world.toAggregate()).toEqual(b.world.toAggregate())
  })

  it('does not reseed a branch that already has events', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx(), world, branchId))
    const countAfterFirst = world.resolveEvents(branchId).length
    const second = await collect(runGeneration(ctx(), world, branchId))
    expect(second.map((e) => e.type)).toEqual(['run.started', 'run.completed'])
    expect(world.resolveEvents(branchId)).toHaveLength(countAfterFirst)
  })
})
