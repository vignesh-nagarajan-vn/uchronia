import type { Branch, PointOfDivergence, Timeline } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { GenerationAbortedError } from '../errors.js'
import type { LLMProvider } from '../llm.js'
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

describe('runGeneration — full pipeline (mock)', () => {
  it('generates seed plus the era loop out to the horizon', async () => {
    const { world, branchId } = freshWorld()
    const events = await collect(runGeneration(ctx(), world, branchId))

    expect(events[0]).toEqual({ type: 'run.started', branchId })
    expect(events.at(-1)).toEqual({ type: 'run.completed', branchId })

    // 150-year horizon → seed era + widening eras (2,8,13,21,34,55,17-clip).
    const eras = world.resolveEras(branchId)
    expect(eras.length).toBeGreaterThanOrEqual(5)
    expect(eras[0]?.ordinal).toBe(0)
    expect(eras.at(-1)?.endYear).toBe(-48 + 150)

    // Later eras carry pressures (§4.3); the seed does not.
    expect(eras[0]?.pressures).toEqual([])
    for (const era of eras.slice(1)) {
      expect(era.pressures.length).toBeGreaterThanOrEqual(3)
      expect(era.pressures.length).toBeLessThanOrEqual(7)
    }

    // The stream matches the store.
    const accepted = events.filter((e) => e.type === 'event.accepted')
    const resolved = world.resolveEvents(branchId)
    expect(resolved).toHaveLength(accepted.length)
    expect(resolved.length).toBeGreaterThanOrEqual(20)

    // Seed discipline holds for the first era.
    for (const event of resolved.filter((e) => e.eraId === eras[0]?.id)) {
      expect(event.wildcard).toBe(false)
      expect(event.plausibility.score).toBeGreaterThanOrEqual(0.6)
      expect(event.distanceFromPod).toBeLessThanOrEqual(2)
    }

    // P6 across the whole run: registers beyond the political.
    const lenses = new Set(resolved.flatMap((e) => e.lenses))
    expect(lenses.has('economic')).toBe(true)
    expect(lenses.has('daily-life') || lenses.has('cultural')).toBe(true)

    // The demo dual-review paths fired: at least one disputed event survives,
    // visibly marked, with critic notes attached (P4).
    const disputed = resolved.filter((e) => e.flags.disputed)
    expect(disputed.length).toBeGreaterThanOrEqual(1)
    expect(disputed[0]?.criticNotes?.length).toBeGreaterThanOrEqual(1)
    // And the fixable cliche was repaired rather than committed.
    expect(resolved.some((e) => /\bsuddenly\b/i.test(e.summary))).toBe(false)

    // Convergence points exist and mark their events (P3).
    const convergences = world.resolveConvergences(branchId)
    expect(convergences.length).toBeGreaterThanOrEqual(1)
    for (const point of convergences) {
      expect(world.getEvent(point.eventId).flags.convergence).toBe(true)
    }
    const convergenceFrames = events.filter((e) => e.type === 'convergence.found')
    expect(convergenceFrames).toHaveLength(convergences.length)

    // Critique reports were persisted for every era.
    expect(world.critiqueReports().length).toBe(eras.length)

    // And the machine validator is satisfied by the whole branch.
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('is deterministic end to end for identical inputs', async () => {
    const a = freshWorld()
    const b = freshWorld()
    await collect(runGeneration(ctx(), a.world, a.branchId))
    await collect(runGeneration(ctx(), b.world, b.branchId))
    expect(a.world.toAggregate()).toEqual(b.world.toAggregate())
  })

  it('resumes an interrupted run at the next unwritten era', async () => {
    const { world, branchId } = freshWorld()
    // One ctx across both runs — like the server, whose idgen outlives runs.
    const sharedCtx = ctx()
    // Interrupt after the third era completes.
    let eraCount = 0
    const run = runGeneration(sharedCtx, world, branchId)
    for await (const ev of run) {
      if (ev.type === 'era.completed') {
        eraCount++
        if (eraCount === 3) break
      }
    }
    await run.return(undefined)
    expect(world.ownEras(branchId)).toHaveLength(3)

    // A second run continues — no reseeding, no duplicate eras.
    await collect(runGeneration(sharedCtx, world, branchId))
    const eras = world.ownEras(branchId)
    expect(eras.length).toBeGreaterThanOrEqual(5)
    expect(new Set(eras.map((e) => e.ordinal)).size).toBe(eras.length)
    expect(eras.at(-1)?.endYear).toBe(-48 + 150)
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('aborts cooperatively between eras, leaving committed history valid', async () => {
    const { world, branchId } = freshWorld()
    const controller = new AbortController()
    const abortingCtx: PipelineCtx = { ...ctx(), signal: controller.signal }

    let eraCount = 0
    const run = runGeneration(abortingCtx, world, branchId)
    await expect(async () => {
      for await (const ev of run) {
        if (ev.type === 'era.completed') {
          eraCount++
          if (eraCount === 2) controller.abort()
        }
      }
    }).rejects.toThrow(GenerationAbortedError)

    // Whatever committed before the abort stands, whole and valid.
    expect(world.ownEras(branchId).length).toBeGreaterThanOrEqual(2)
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('degrades a failed convergence scan to a warning instead of losing the era', async () => {
    const { world, branchId } = freshWorld()
    const inner = new MockProvider()
    const flaky: LLMProvider = {
      mode: inner.mode,
      complete: (request) => {
        if (request.templateId === 'convergence-scan') {
          throw new Error('the scanner is on strike')
        }
        return inner.complete(request)
      },
    }
    const events = await collect(
      runGeneration({ ...ctx(), provider: flaky }, world, branchId),
    )

    expect(events.at(-1)).toEqual({ type: 'run.completed', branchId })
    expect(
      events.some(
        (e) => e.type === 'warning' && e.message.includes('convergence scan failed'),
      ),
    ).toBe(true)
    // Every era still completed and the branch validates; no convergences exist.
    expect(world.ownEras(branchId).length).toBeGreaterThanOrEqual(5)
    expect(world.resolveConvergences(branchId)).toEqual([])
    expect(validateBranch(world, branchId)).toEqual([])
  })

  it('does nothing on a branch already generated to the horizon', async () => {
    const { world, branchId } = freshWorld()
    await collect(runGeneration(ctx(), world, branchId))
    const countAfterFirst = world.resolveEvents(branchId).length
    const second = await collect(runGeneration(ctx(), world, branchId))
    expect(second.map((e) => e.type)).toEqual(['run.started', 'run.completed'])
    expect(world.resolveEvents(branchId)).toHaveLength(countAfterFirst)
  })
})
