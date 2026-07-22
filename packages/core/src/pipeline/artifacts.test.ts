import { ARTIFACT_KINDS, Artifact } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../errors.js'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { World } from '../world.js'
import { generateArtifact } from './artifacts.js'
import type { PipelineCtx } from './ctx.js'

function setup(): { world: World; ctx: PipelineCtx } {
  return {
    world: World.fromAggregate(fixtureAggregate()),
    ctx: {
      provider: new MockProvider(),
      idgen: sequentialIdGen('A8'),
      clock: fixedClock('2026-07-22T12:00:00.000Z'),
    },
  }
}

describe('generateArtifact — the four diegetic kinds', () => {
  it('generates a schema-valid artifact of every kind', async () => {
    const { world, ctx } = setup()
    for (const kind of ARTIFACT_KINDS) {
      const { artifact, created } = await generateArtifact(ctx, world, FX.rootBranch, FX.e0, kind)
      expect(created).toBe(true)
      const parsed = Artifact.parse(artifact)
      expect(parsed.kind).toBe(kind)
      expect(parsed.body.kind).toBe(kind)
      expect(parsed.eventId).toBe(FX.e0)
    }
    expect(world.artifactsForEvent(FX.e0)).toHaveLength(ARTIFACT_KINDS.length)
  })

  it('is period-aware: medieval Mediterranean flavor reaches the page', async () => {
    const { world, ctx } = setup()
    const { artifact } = await generateArtifact(ctx, world, FX.rootBranch, FX.e1, 'newspaper')
    if (artifact.body.kind !== 'newspaper') throw new Error('wrong kind')
    // 1453 Mediterranean → medieval bucket → Constantinople masthead.
    expect(artifact.body.masthead).toContain('Constantinople')
    expect(artifact.body.headline).toBe(world.getEvent(FX.e1).title.toUpperCase())
    expect(artifact.body.notices.length).toBeGreaterThanOrEqual(2)
  })

  it('returns the existing artifact for a repeated (event, kind)', async () => {
    const { world, ctx } = setup()
    const first = await generateArtifact(ctx, world, FX.rootBranch, FX.e3, 'letter')
    const second = await generateArtifact(ctx, world, FX.rootBranch, FX.e3, 'letter')
    expect(second.created).toBe(false)
    expect(second.artifact.id).toBe(first.artifact.id)
  })

  it('returns the fixture letter for its event', async () => {
    const { world, ctx } = setup()
    const { artifact, created } = await generateArtifact(ctx, world, FX.rootBranch, FX.e2, 'letter')
    expect(created).toBe(false)
    expect(artifact.id).toBe(FX.artifact1)
  })

  it('refuses events not visible from the branch', async () => {
    const { world, ctx } = setup()
    await expect(generateArtifact(ctx, world, FX.childBranch, FX.e4, 'poster')).rejects.toThrow(
      NotFoundError,
    )
  })
})
