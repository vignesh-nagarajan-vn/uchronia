import { BranchView, CompareView, CreateTimelineResponse, ForkResponse } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

async function generatedTimeline(app: Awaited<ReturnType<typeof makeTestApp>>['app']) {
  const created = CreateTimelineResponse.parse(
    await (
      await postJson(app, '/api/timelines', {
        podText: 'Constantinople holds in 1453',
        horizonYears: 120,
      })
    ).json(),
  )
  await (
    await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
  ).text()
  const view = BranchView.parse(
    await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
  )
  return { created, view }
}

describe('fork + compare end to end', () => {
  it('forks, generates the child, and compares the two branches', async () => {
    const { app } = makeTestApp()
    const { created, view } = await generatedTimeline(app)
    const forkEvent = view.events[Math.floor(view.events.length / 2)]
    if (!forkEvent) throw new Error('no fork event')

    const forked = await postJson(app, `/api/branches/${created.rootBranch.id}/fork`, {
      eventId: forkEvent.id,
      subPodText: 'What if the harbor chain failed the next spring?',
    })
    expect(forked.status).toBe(201)
    const { branch } = ForkResponse.parse(await forked.json())
    expect(branch.subPod?.statement).toBeTruthy()

    await (await app.request(`/api/branches/${branch.id}/generate`, { method: 'POST' })).text()

    const childView = BranchView.parse(
      await (await app.request(`/api/branches/${branch.id}/view`)).json(),
    )
    expect(childView.events.length).toBeGreaterThan(0)
    expect(childView.branch.id).toBe(branch.id)
    // Shared prefix plus own history.
    const ownEvents = childView.events.filter((e) => e.branchId === branch.id)
    expect(ownEvents.length).toBeGreaterThanOrEqual(5)
    expect(ownEvents[0]?.title).toBe('The second divergence lands')

    // Compare branch vs branch.
    const cmp = await app.request(`/api/compare?a=${branch.id}&b=${created.rootBranch.id}`)
    expect(cmp.status).toBe(200)
    const compare = CompareView.parse(await cmp.json())
    expect(compare.sharedEventIds.length).toBeGreaterThanOrEqual(1)
    expect(compare.divergesAfterEventId).toBe(forkEvent.id)
    if ('baseline' in compare.b) throw new Error('expected branch side')
    expect(compare.b.branch.id).toBe(created.rootBranch.id)
  })

  it('burns a leaf branch cleanly, refuses roots and parents', async () => {
    const { app } = makeTestApp()
    const { created, view } = await generatedTimeline(app)
    const forkEvent = view.events[2]
    if (!forkEvent) throw new Error('no fork event')

    const forked = await postJson(app, `/api/branches/${created.rootBranch.id}/fork`, {
      eventId: forkEvent.id,
    })
    const { branch } = ForkResponse.parse(await forked.json())
    await (await app.request(`/api/branches/${branch.id}/generate`, { method: 'POST' })).text()

    // A root refuses.
    const rootDel = await app.request(`/api/branches/${created.rootBranch.id}`, {
      method: 'DELETE',
    })
    expect(rootDel.status).toBe(409)

    // Fork a grandchild, then the middle branch refuses while it has children.
    const childView = BranchView.parse(
      await (await app.request(`/api/branches/${branch.id}/view`)).json(),
    )
    const ownEvent = childView.events.find((e) => e.branchId === branch.id)
    if (!ownEvent) throw new Error('no own event')
    const grand = ForkResponse.parse(
      await (
        await postJson(app, `/api/branches/${branch.id}/fork`, { eventId: ownEvent.id })
      ).json(),
    )
    const midDel = await app.request(`/api/branches/${branch.id}`, { method: 'DELETE' })
    expect(midDel.status).toBe(409)

    // Leaves burn: grandchild, then the child.
    expect(
      (await app.request(`/api/branches/${grand.branch.id}`, { method: 'DELETE' })).status,
    ).toBe(204)
    expect((await app.request(`/api/branches/${branch.id}`, { method: 'DELETE' })).status).toBe(
      204,
    )

    // The parent is intact and the burned branch is gone.
    expect((await app.request(`/api/branches/${branch.id}/view`)).status).toBe(404)
    const rootView = BranchView.parse(
      await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
    )
    expect(rootView.events.length).toBe(view.events.length)
    expect(rootView.branches.some((b) => b.id === branch.id)).toBe(false)
  })

  it('compares a branch against the curated record', async () => {
    const { app } = makeTestApp()
    const { created } = await generatedTimeline(app)
    const cmp = await app.request(`/api/compare?a=${created.rootBranch.id}&b=baseline`)
    expect(cmp.status).toBe(200)
    const compare = CompareView.parse(await cmp.json())
    if (!('baseline' in compare.b)) throw new Error('expected baseline side')
    expect(compare.b.anchors.length).toBeGreaterThanOrEqual(3)
    // Anchors are clamped to the timeline's window.
    for (const anchor of compare.b.anchors) {
      expect(anchor.year).toBeGreaterThanOrEqual(compare.pod.year - 50)
      expect(anchor.year).toBeLessThanOrEqual(compare.pod.year + 120)
    }
  })

  it('rejects forks at events invisible from the branch', async () => {
    const { app } = makeTestApp()
    const { created } = await generatedTimeline(app)
    const res = await postJson(app, `/api/branches/${created.rootBranch.id}/fork`, {
      eventId: '01EV00000000000000000000ZZ',
    })
    expect([404, 409]).toContain(res.status)
  })

  it('rejects cross-timeline comparisons', async () => {
    const { app } = makeTestApp()
    const first = await generatedTimeline(app)
    const second = CreateTimelineResponse.parse(
      await (
        await postJson(app, '/api/timelines', { podText: 'The 1848 revolutions succeed' })
      ).json(),
    )
    const res = await app.request(
      `/api/compare?a=${first.created.rootBranch.id}&b=${second.rootBranch.id}`,
    )
    expect(res.status).toBe(400)
  })
})
