import type { Branch, PointOfDivergence, Timeline } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import type { LLMProvider, StructuredRequest } from '../llm.js'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import type { EraGenerateArgs } from '../prompts/era-generate.js'
import { validateWorld } from '../validator.js'
import { World } from '../world.js'
import type { PipelineCtx } from './ctx.js'
import { forkBranch } from './fork.js'
import { runGeneration } from './run.js'

const NOW = '2026-07-22T12:00:00.000Z'

function freshWorld(): { world: World; rootId: string; ctx: PipelineCtx } {
  const idgen = sequentialIdGen('F7')
  const timelineId = idgen.next()
  const timeline: Timeline = {
    id: timelineId,
    title: 'The Standing Wall',
    createdAt: NOW,
    settings: {
      dial: 55,
      derivation: 'standard',
      court: false,
      epilogue: false,
      horizonYears: 120,
      defaultLenses: ['political', 'economic'],
      models: { generation: 'mock', critic: 'mock', mode: 'mock' },
    },
  }
  const pod: PointOfDivergence = {
    id: idgen.next(),
    timelineId,
    raw: 'What if Constantinople never fell in 1453?',
    statement: 'The Theodosian walls hold in May 1453.',
    year: 1453,
    dateLabel: 'May 1453',
    region: 'Mediterranean',
    mechanism: 'politics',
    baselineContext: 'Mehmed II took the city on 29 May 1453; the Eastern Roman Empire ended.',
    provenance: { kind: 'user' },
  }
  const root: Branch = {
    id: idgen.next(),
    timelineId,
    parentBranchId: null,
    forkEventId: null,
    subPod: null,
    name: 'main line',
    createdAt: NOW,
  }
  const world = new World(timeline, pod)
  world.addBranch(root)
  return {
    world,
    rootId: root.id,
    ctx: { provider: new MockProvider(), idgen, clock: fixedClock(NOW) },
  }
}

async function drain(gen: AsyncGenerator<unknown>): Promise<void> {
  let consumed = 0
  for await (const event of gen) {
    if (event) consumed++
  }
  if (consumed === 0) throw new Error('generation produced no events')
}

describe('forking end to end (mock)', () => {
  it('forks mid-history with a sub-POD and generates the child forward', async () => {
    const { world, rootId, ctx } = freshWorld()
    await drain(runGeneration(ctx, world, rootId))

    const rootEvents = world.resolveEvents(rootId)
    const forkEvent = rootEvents[Math.floor(rootEvents.length / 2)]
    if (!forkEvent) throw new Error('no fork event')

    const child = await forkBranch(ctx, world, {
      viewedBranchId: rootId,
      forkEventId: forkEvent.id,
      subPodRaw: 'What if the emperor died of plague the following winter?',
    })
    expect(child.subPod?.statement).toBeTruthy()
    expect(child.subPod?.raw).toContain('plague')
    expect(child.name.length).toBeGreaterThan(3)

    await drain(runGeneration(ctx, world, child.id))

    const childEvents = world.resolveEvents(child.id)
    const prefix = rootEvents.slice(0, rootEvents.findIndex((e) => e.id === forkEvent.id) + 1)
    // Shared prefix, then the child's own history.
    expect(childEvents.slice(0, prefix.length).map((e) => e.id)).toEqual(prefix.map((e) => e.id))
    const own = childEvents.slice(prefix.length)
    expect(own.length).toBeGreaterThanOrEqual(8)
    for (const event of own) {
      expect(event.branchId).toBe(child.id)
      expect(event.date.year).toBeGreaterThanOrEqual(forkEvent.date.year)
    }
    // The sub-divergence lands as the first own event.
    expect(own[0]?.title).toBe('The second divergence lands')
    expect(own[0]?.summary).toContain(child.subPod?.statement ?? '@@')

    // The parent saw nothing of it.
    expect(world.resolveEvents(rootId).map((e) => e.id)).toEqual(rootEvents.map((e) => e.id))

    // And both branches satisfy the machine validator.
    expect(validateWorld(world)).toEqual([])
  })

  it('supports multi-level forks: a grandchild generated from a child', async () => {
    const { world, rootId, ctx } = freshWorld()
    await drain(runGeneration(ctx, world, rootId))
    const rootEvents = world.resolveEvents(rootId)
    const firstFork = rootEvents[2]
    if (!firstFork) throw new Error('missing fork event')

    const child = await forkBranch(ctx, world, {
      viewedBranchId: rootId,
      forkEventId: firstFork.id,
      subPodRaw: 'What if the treasury reform failed outright?',
    })
    await drain(runGeneration(ctx, world, child.id))

    // Fork the child at one of ITS OWN events.
    const childOwn = world.ownEvents(child.id)
    const secondFork = childOwn[1]
    if (!secondFork) throw new Error('missing second fork event')
    const grandchild = await forkBranch(ctx, world, {
      viewedBranchId: child.id,
      forkEventId: secondFork.id,
    })
    expect(grandchild.parentBranchId).toBe(child.id)
    await drain(runGeneration(ctx, world, grandchild.id))

    const gcEvents = world.resolveEvents(grandchild.id)
    // Grandchild sees: root prefix + child prefix + own events.
    expect(gcEvents.some((e) => e.branchId === rootId)).toBe(true)
    expect(gcEvents.some((e) => e.branchId === child.id)).toBe(true)
    expect(gcEvents.some((e) => e.branchId === grandchild.id)).toBe(true)
    // Nothing beyond the cut leaks through.
    const cutOrdinal = secondFork.ordinal
    for (const e of gcEvents.filter((e) => e.branchId === child.id)) {
      expect(e.ordinal).toBeLessThanOrEqual(cutOrdinal)
    }
    expect(validateWorld(world)).toEqual([])

    // Three branches, three distinct presents for the same entity.
    const [nation] = world.resolveEntities(rootId).filter((e) => e.type === 'nation')
    if (nation) {
      const states = [rootId, child.id, grandchild.id].map((b) =>
        JSON.stringify(world.stateAt(b).get(nation.id)),
      )
      expect(new Set(states).size).toBeGreaterThanOrEqual(2)
    }
  })

  it('opens a forked branch as tightly as a fresh root (P2 from the fork year)', async () => {
    const { world, rootId, ctx } = freshWorld()
    await drain(runGeneration(ctx, world, rootId))
    const rootEvents = world.resolveEvents(rootId)
    // Fork late - decades downstream of the root POD.
    const forkEvent = rootEvents[rootEvents.length - 2]
    if (!forkEvent) throw new Error('missing fork event')
    expect(forkEvent.date.year).toBeGreaterThan(world.pod.year + 30)

    const child = await forkBranch(ctx, world, {
      viewedBranchId: rootId,
      forkEventId: forkEvent.id,
    })

    const requests: StructuredRequest[] = []
    const spy: LLMProvider = {
      mode: ctx.provider.mode,
      complete: (request) => {
        requests.push(request)
        return ctx.provider.complete(request)
      },
    }
    await drain(runGeneration({ ...ctx, provider: spy }, world, child.id))

    const firstEra = requests.find((r) => r.templateId === 'era-generate')
    if (!firstEra) throw new Error('child generated no era')
    const args = firstEra.args as EraGenerateArgs
    // Discipline measured from the fork, not the root POD: a tight first era.
    expect(args.distanceYears).toBe(0)
    expect(args.batchSize).toBe(4)
    expect(args.wildcardBudget).toBe(0)
    // While the narrative frame still knows how far the root divergence lies.
    expect(args.podDistanceYears).toBeGreaterThan(30)
  })

  it('forks without a sub-POD, naming the branch after the fork event', async () => {
    const { world, rootId, ctx } = freshWorld()
    await drain(runGeneration(ctx, world, rootId))
    const event = world.resolveEvents(rootId)[1]
    if (!event) throw new Error('missing event')
    const child = await forkBranch(ctx, world, {
      viewedBranchId: rootId,
      forkEventId: event.id,
    })
    expect(child.subPod).toBeNull()
    expect(child.name).toContain('after')
  })
})
