import type { Branch, PointOfDivergence, Timeline } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { indexContinuity, validateBranch } from '../validator.js'
import { World } from '../world.js'
import { summarizeIndices } from './context.js'
import type { PipelineCtx } from './ctx.js'
import type { PipelineEvent } from './events.js'
import { forkBranch } from './fork.js'
import { runGeneration } from './run.js'

const NOW = '2026-07-22T12:00:00.000Z'

function freshWorld(over: Partial<Timeline['settings']> = {}): { world: World; branchId: string } {
  const idgen = sequentialIdGen('CM')
  const timelineId = idgen.next()
  const timeline: Timeline = {
    id: timelineId,
    title: 'The Moving Dials',
    createdAt: NOW,
    settings: {
      dial: 50,
      derivation: 'standard',
      court: false,
      epilogue: false,
      horizonYears: 120,
      defaultLenses: ['political', 'economic'],
      models: { generation: 'mock', critic: 'mock', mode: 'mock' },
      ...over,
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
    baselineContext: 'Mehmed II took the city on 29 May 1453.',
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

function ctx(seed = 'CR'): PipelineCtx {
  return { provider: new MockProvider(), idgen: sequentialIdGen(seed), clock: fixedClock(NOW) }
}

async function collect(gen: AsyncGenerator<PipelineEvent>): Promise<PipelineEvent[]> {
  const out: PipelineEvent[] = []
  for await (const ev of gen) out.push(ev)
  return out
}

describe('claims: regional indices and name drift (v2/M18)', () => {
  it('records index readings against the era that moved them', async () => {
    const { world, branchId } = freshWorld()
    const stream = await collect(runGeneration(ctx(), world, branchId))

    const recorded = stream.filter((e) => e.type === 'claim.recorded')
    expect(recorded.length).toBeGreaterThan(0)

    const claims = world.resolveClaims(branchId)
    expect(claims.length).toBe(recorded.length)
    const indices = claims.filter((c) => c.body.kind === 'regional-index')
    expect(indices.length).toBeGreaterThanOrEqual(2)
    // Every claim hangs off an event this branch can actually see.
    const visible = new Set(world.resolveEvents(branchId).map((e) => e.id))
    for (const claim of claims) expect(visible.has(claim.eventId)).toBe(true)
    // And the dials stay inside their range.
    for (const claim of indices) {
      if (claim.body.kind !== 'regional-index') continue
      expect(claim.body.value).toBeGreaterThanOrEqual(0)
      expect(claim.body.value).toBeLessThanOrEqual(100)
    }
  })

  it('keeps the readings continuous: the recorded delta is the real one', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx(), world, branchId))
    // Rule 12 polices exactly this, and it must find nothing on a clean run.
    expect(indexContinuity(world, branchId)).toEqual([])
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('carries the latest reading per region into the prompts', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx(), world, branchId))
    const latest = world.regionalIndices(branchId)
    expect(latest.size).toBeGreaterThanOrEqual(2)
    const summary = summarizeIndices(world, branchId)
    expect(summary).toContain('Mediterranean')
    expect(summary).toMatch(/population \d+/)
    // A branch with no claims says nothing rather than printing an empty table.
    const { world: empty, branchId: emptyBranch } = freshWorld()
    expect(summarizeIndices(empty, emptyBranch)).toBe('')
  })

  it('drifts names against real events, and glosses only names', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx(), world, branchId))
    const drifts = world
      .resolveClaims(branchId)
      .filter((c) => c.body.kind === 'name-drift')
      .map((c) => c.body)
    expect(drifts.length).toBeGreaterThanOrEqual(1)
    for (const drift of drifts) {
      if (drift.kind !== 'name-drift') continue
      expect(drift.attested).not.toBe(drift.drifted)
      expect(drift.note.length).toBeGreaterThan(0)
    }
  })

  it('a fork does not inherit claims made after its cut', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx(), world, branchId))
    const events = world.resolveEvents(branchId)
    const cutAt = events[Math.floor(events.length / 3)]
    if (!cutAt) throw new Error('no fork event')

    const child = await forkBranch(ctx('FK'), world, {
      viewedBranchId: branchId,
      forkEventId: cutAt.id,
    })
    const childId = child.id

    const parentClaims = world.resolveClaims(branchId).length
    const childClaims = world.resolveClaims(childId).length
    expect(childClaims).toBeLessThan(parentClaims)
    // Everything the child does see is anchored before its cut.
    const childVisible = new Set(world.resolveEvents(childId).map((e) => e.id))
    for (const claim of world.resolveClaims(childId)) {
      expect(childVisible.has(claim.eventId)).toBe(true)
    }
  })
})

describe('the epilogue (v2/M18)', () => {
  it('adds exactly one speculative era past the horizon, marked as one', async () => {
    const { world, branchId } = freshWorld({ epilogue: true })
    await collect(runGeneration(ctx('EP'), world, branchId))
    const eras = world.resolveEras(branchId)
    const speculative = eras.filter((e) => e.speculative)
    expect(speculative).toHaveLength(1)
    const epilogue = speculative[0]
    expect(epilogue).toBeDefined()
    expect(epilogue?.ordinal).toBe(eras.length - 1)
    expect(epilogue?.startYear).toBe(1453 + 120)
    expect(epilogue?.endYear).toBe(1453 + 120 + 50)
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('derives nothing speculative when the epilogue is off', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx('NE'), world, branchId))
    const eras = world.resolveEras(branchId)
    expect(eras.every((e) => !e.speculative)).toBe(true)
    expect(eras.at(-1)?.endYear).toBe(1453 + 120)
  })
})
