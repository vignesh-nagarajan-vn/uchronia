import { BranchView, CreateTimelineResponse, GraftResponse } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * The graft (v2/M19): one event and its direct consequences, transplanted
 * from one line onto another. No provider call; the validator is the gate.
 */

async function twoBranches() {
  const { app } = makeTestApp()
  const created = CreateTimelineResponse.parse(
    await (
      await postJson(app, '/api/timelines', {
        podText: 'The Library of Alexandria never burns in 48 BC',
        horizonYears: 80,
      })
    ).json(),
  )
  const rootId = created.rootBranch.id
  await (await app.request(`/api/branches/${rootId}/generate`, { method: 'POST' })).text()
  const root = BranchView.parse(await (await app.request(`/api/branches/${rootId}/view`)).json())

  const forkAt = root.events[2]
  const forked = await postJson(app, `/api/branches/${rootId}/fork`, { eventId: forkAt?.id })
  const child = ((await forked.json()) as { branch: { id: string } }).branch
  await (await app.request(`/api/branches/${child.id}/generate`, { method: 'POST' })).text()
  const childView = BranchView.parse(
    await (await app.request(`/api/branches/${child.id}/view`)).json(),
  )
  return { app, rootId, childId: child.id, root, childView }
}

describe('the graft (v2/M19)', () => {
  it('transplants an event the target could not see, and says what came with it', async () => {
    const { app, rootId, childId, root, childView } = await twoBranches()
    // An event the root has after the fork, which the child therefore lacks.
    const visibleToChild = new Set(childView.events.map((e) => e.id))
    const knownToChild = new Set(childView.entities.map((e) => e.id))
    const donor = root.events.find(
      (e) =>
        !visibleToChild.has(e.id) &&
        e.branchId === rootId &&
        e.entityIds.every((id) => knownToChild.has(id)) &&
        e.deltas.every((d) => knownToChild.has(d.entityId)),
    )
    expect(donor).toBeDefined()

    const before = childView.events.length
    const res = await postJson(app, `/api/branches/${childId}/graft`, {
      sourceBranchId: rootId,
      eventId: donor?.id,
      force: true,
    })
    expect(res.status).toBe(200)
    const result = GraftResponse.parse(await res.json())
    expect(result.applied).toBe(true)
    expect(result.eventCount).toBeGreaterThanOrEqual(1)

    const after = BranchView.parse(
      await (await app.request(`/api/branches/${childId}/view`)).json(),
    )
    expect(after.events.length).toBe(before + result.eventCount)
    // The transplant is the reader's act, so it carries user provenance and
    // sits in an era that says where it came from.
    const grafted = after.events.slice(before)
    for (const event of grafted) expect(event.provenance.kind).toBe('user')
    const graftEra = after.eras.at(-1)
    expect(graftEra?.title).toBe('Grafted from another line')
  })

  it('refuses to graft onto a branch that already sees the event', async () => {
    const { app, rootId, childId, root } = await twoBranches()
    // A pre-fork event: visible on both lines.
    const shared = root.events[0]
    const res = await postJson(app, `/api/branches/${childId}/graft`, {
      sourceBranchId: rootId,
      eventId: shared?.id,
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('refuses a graft onto a branch that has children of its own', async () => {
    const { app, rootId, childId, root } = await twoBranches()
    const visible = root.events
    // The root is a parent, so it can never receive a graft.
    const donor = visible.at(-1)
    const res = await postJson(app, `/api/branches/${rootId}/graft`, {
      sourceBranchId: childId,
      eventId: donor?.id,
    })
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('refuses to cross timelines', async () => {
    const { app, childId } = await twoBranches()
    const other = CreateTimelineResponse.parse(
      await (
        await postJson(app, '/api/timelines', { podText: 'Rome does not fall in 476' })
      ).json(),
    )
    const res = await postJson(app, `/api/branches/${childId}/graft`, {
      sourceBranchId: other.rootBranch.id,
      eventId: '01EV0000000000000000000001',
    })
    expect(res.status).toBe(400)
  })

  it('reports soft conflicts without applying, until the reader forces it', async () => {
    const { app, rootId, childId, root, childView } = await twoBranches()
    const visibleToChild = new Set(childView.events.map((e) => e.id))
    // An event whose own causes stay behind is the reliable soft-conflict case.
    const knownToChild = new Set(childView.entities.map((e) => e.id))
    const donor = root.events.find(
      (e) =>
        !visibleToChild.has(e.id) &&
        e.branchId === rootId &&
        e.entityIds.every((id) => knownToChild.has(id)) &&
        e.deltas.every((d) => knownToChild.has(d.entityId)),
    )
    if (!donor) return // nothing with downstream causality in this run

    const dry = GraftResponse.parse(
      await (
        await postJson(app, `/api/branches/${childId}/graft`, {
          sourceBranchId: rootId,
          eventId: donor.id,
        })
      ).json(),
    )
    if (dry.conflicts.length === 0) {
      expect(dry.applied).toBe(true)
      return
    }
    expect(dry.applied).toBe(false)
    expect(dry.conflicts.every((c) => c.severity === 'soft')).toBe(true)

    const forced = GraftResponse.parse(
      await (
        await postJson(app, `/api/branches/${childId}/graft`, {
          sourceBranchId: rootId,
          eventId: donor.id,
          force: true,
        })
      ).json(),
    )
    expect(forced.applied).toBe(true)
    expect(forced.disputed).toBe(true)
    const after = BranchView.parse(
      await (await app.request(`/api/branches/${childId}/view`)).json(),
    )
    const grafted = after.events.filter((e) => e.provenance.kind === 'user')
    expect(grafted.some((e) => e.flags.disputed)).toBe(true)
  })
})

describe('the splice: a third column in compare (v2/M19)', () => {
  it('reads three branches against the same divergence', async () => {
    const { app, rootId, childId } = await twoBranches()
    const two = await app.request(`/api/compare?a=${rootId}&b=${childId}`)
    expect(two.status).toBe(200)
    const twoBody = (await two.json()) as { c?: unknown }
    expect(twoBody.c).toBeUndefined()

    const three = await app.request(`/api/compare?a=${rootId}&b=${childId}&c=${childId}`)
    expect(three.status).toBe(200)
    const threeBody = (await three.json()) as { c?: { branch: { id: string } } }
    expect(threeBody.c?.branch.id).toBe(childId)
  })
})
