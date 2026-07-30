import { BranchView, CreateTimelineResponse, EntityFatesResponse, Pulse } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * Branch algebra, read-only (v2/M19): the pulse forecasts without committing,
 * and the fate table reports one entity across every branch. Neither may
 * write anything.
 */

async function derived() {
  const { app } = makeTestApp()
  const created = CreateTimelineResponse.parse(
    await (
      await postJson(app, '/api/timelines', {
        podText: 'The Library of Alexandria never burns in 48 BC',
        horizonYears: 80,
      })
    ).json(),
  )
  await (
    await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
  ).text()
  const view = BranchView.parse(
    await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
  )
  return { app, created, view }
}

describe('the counterfactual pulse (v2/M19)', () => {
  it('forecasts a flip without committing anything', async () => {
    const { app, created, view } = await derived()
    const target = view.events[Math.floor(view.events.length / 2)]
    expect(target).toBeDefined()

    const res = await postJson(
      app,
      `/api/branches/${created.rootBranch.id}/events/${target?.id}/pulse`,
      { flip: 'the reform is refused outright' },
    )
    expect(res.status).toBe(200)
    const { pulse } = (await res.json()) as { pulse: unknown }
    const parsed = Pulse.parse(pulse)
    expect(parsed.eventId).toBe(target?.id)
    expect(parsed.deltas.length).toBeGreaterThanOrEqual(3)
    expect(parsed.deltas.length).toBeLessThanOrEqual(8)
    expect(parsed.suggestedSubPod.length).toBeGreaterThan(0)
    for (const delta of parsed.deltas) {
      expect(delta.confidence).toBeGreaterThanOrEqual(0)
      expect(delta.confidence).toBeLessThanOrEqual(1)
    }

    // Nothing was written: the ledger is exactly as it was.
    const after = BranchView.parse(
      await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
    )
    expect(after.events.length).toBe(view.events.length)
    expect(after.branches.length).toBe(view.branches.length)
  })

  it('refuses to pulse an event the branch cannot see', async () => {
    const { app, created } = await derived()
    const res = await postJson(
      app,
      `/api/branches/${created.rootBranch.id}/events/01EV0000000000000000000404/pulse`,
      {},
    )
    expect(res.status).toBe(404)
  })

  it('is deterministic in demo mode, so the ghost preview does not flicker', async () => {
    const { app, created, view } = await derived()
    const target = view.events[2]
    const once = await postJson(
      app,
      `/api/branches/${created.rootBranch.id}/events/${target?.id}/pulse`,
      { flip: 'the envoy never sails' },
    )
    const twice = await postJson(
      app,
      `/api/branches/${created.rootBranch.id}/events/${target?.id}/pulse`,
      { flip: 'the envoy never sails' },
    )
    const a = Pulse.parse(((await once.json()) as { pulse: unknown }).pulse)
    const b = Pulse.parse(((await twice.json()) as { pulse: unknown }).pulse)
    expect(b.headline).toBe(a.headline)
    expect(b.deltas).toEqual(a.deltas)
  })
})

describe('the cross-branch fate table (v2/M19)', () => {
  it('reports one entity across every branch that can see it', async () => {
    const { app, created, view } = await derived()
    const forkAt = view.events[Math.floor(view.events.length / 2)]
    const forked = await postJson(app, `/api/branches/${created.rootBranch.id}/fork`, {
      eventId: forkAt?.id,
      subPodText: 'What if the patron withdrew his money?',
    })
    expect(forked.status).toBe(201)
    const child = (await forked.json()) as { branch: { id: string } }
    await (
      await app.request(`/api/branches/${child.branch.id}/generate`, { method: 'POST' })
    ).text()

    const entity = view.entities[0]
    expect(entity).toBeDefined()
    const res = await app.request(
      `/api/branches/${created.rootBranch.id}/entities/${entity?.id}/fates`,
    )
    expect(res.status).toBe(200)
    const fates = EntityFatesResponse.parse(await res.json())
    expect(fates.entitySlug).toBe(entity?.slug)
    // Both the root and the child see this entity, and each reports its own row.
    expect(fates.fates.length).toBeGreaterThanOrEqual(2)
    const branchIds = fates.fates.map((f) => f.branchId)
    expect(new Set(branchIds).size).toBe(branchIds.length)
    for (const fate of fates.fates) {
      expect(fate.eventCount).toBeGreaterThanOrEqual(0)
      expect(fate.standing.length).toBeGreaterThan(0)
    }
  })

  it('404s an entity the branch cannot see', async () => {
    const { app, created } = await derived()
    const res = await app.request(
      `/api/branches/${created.rootBranch.id}/entities/01EN0000000000000000000404/fates`,
    )
    expect(res.status).toBe(404)
  })
})
