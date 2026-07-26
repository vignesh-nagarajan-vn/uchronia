import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { NotFoundError } from '../errors.js'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { World } from '../world.js'
import type { PipelineCtx } from './ctx.js'
import { expandEra, expandEvent, writeBiography } from './expand.js'

function setup(): { world: World; ctx: PipelineCtx } {
  return {
    world: World.fromAggregate(fixtureAggregate()),
    ctx: {
      provider: new MockProvider(),
      idgen: sequentialIdGen('X6'),
      clock: fixedClock('2026-07-22T12:00:00.000Z'),
    },
  }
}

describe('expandEvent', () => {
  it('generates detail conditioned on causes and state at the event', async () => {
    const { world, ctx } = setup()
    const expanded = await expandEvent(ctx, world, FX.rootBranch, FX.e1)
    expect(expanded.detail).toBeTruthy()
    expect(expanded.detail?.split('\n\n').length).toBeGreaterThanOrEqual(2)
    // The store now holds it.
    expect(world.getEvent(FX.e1).detail).toBe(expanded.detail)
  })

  it('fills once - the second expansion returns the first text', async () => {
    const { world, ctx } = setup()
    const first = await expandEvent(ctx, world, FX.rootBranch, FX.e1)
    const second = await expandEvent(ctx, world, FX.childBranch, FX.e1) // shared pre-fork event
    expect(second.detail).toBe(first.detail)
  })

  it('keeps hand-written fixture detail untouched', async () => {
    const { world, ctx } = setup()
    const before = world.getEvent(FX.e0).detail
    const after = await expandEvent(ctx, world, FX.rootBranch, FX.e0)
    expect(after.detail).toBe(before)
  })

  it('refuses events not visible from the branch', async () => {
    const { world, ctx } = setup()
    await expect(expandEvent(ctx, world, FX.childBranch, FX.e4)).rejects.toThrow(NotFoundError)
  })
})

describe('expandEra', () => {
  it('writes the era essay and flips status to expanded', async () => {
    const { world, ctx } = setup()
    const era = await expandEra(ctx, world, FX.rootBranch, FX.era1)
    expect(era.detail).toBeTruthy()
    expect(era.status).toBe('expanded')
    expect(world.getEra(FX.era1).status).toBe('expanded')
  })

  it('refuses eras not visible from the branch', async () => {
    const { world, ctx } = setup()
    await expect(expandEra(ctx, world, FX.childBranch, FX.era1)).rejects.toThrow(NotFoundError)
  })
})

describe('writeBiography', () => {
  it('writes branch-local biographies that differ across branches', async () => {
    const { world, ctx } = setup()
    const rootBio = await writeBiography(ctx, world, FX.rootBranch, FX.byzantium)
    const childBio = await writeBiography(ctx, world, FX.childBranch, FX.byzantium)
    expect(rootBio.biography).toBeTruthy()
    expect(childBio.biography).toBeTruthy()
    // Divergent ledgers ⇒ divergent lives.
    expect(rootBio.biography).not.toBe(childBio.biography)
    expect(rootBio.id).not.toBe(childBio.id)
  })

  it('fills once per (entity, branch)', async () => {
    const { world, ctx } = setup()
    const first = await writeBiography(ctx, world, FX.rootBranch, FX.ottomans)
    const second = await writeBiography(ctx, world, FX.rootBranch, FX.ottomans)
    expect(second.id).toBe(first.id)
    expect(second.biography).toBe(first.biography)
  })

  it('returns the fixture biography where one exists', async () => {
    const { world, ctx } = setup()
    const bio = await writeBiography(ctx, world, FX.rootBranch, FX.constantine)
    expect(bio.id).toBe(FX.bio1)
  })

  it('refuses entities not visible from the branch', async () => {
    const { world, ctx } = setup()
    await expect(writeBiography(ctx, world, FX.childBranch, FX.peraPress)).rejects.toThrow(
      NotFoundError,
    )
  })
})
