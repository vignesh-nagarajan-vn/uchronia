import { EntityBiography, Era, Event } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

async function importFixture(app: Awaited<ReturnType<typeof makeTestApp>>['app']) {
  const res = await postJson(app, '/api/import', fixtureAggregate())
  expect(res.status).toBe(201)
}

describe('lazy expansion routes', () => {
  it('expands an event and persists the detail', async () => {
    const { app } = makeTestApp()
    await importFixture(app)

    const res = await app.request(`/api/branches/${FX.rootBranch}/events/${FX.e1}/expand`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    const { event } = (await res.json()) as { event: unknown }
    const parsed = Event.parse(event)
    expect(parsed.detail).toBeTruthy()

    // Persisted: a fresh read returns the same detail; second expand is a no-op.
    const again = await app.request(`/api/branches/${FX.rootBranch}/events/${FX.e1}/expand`, {
      method: 'POST',
    })
    const { event: second } = (await again.json()) as { event: unknown }
    expect(Event.parse(second).detail).toBe(parsed.detail)
  })

  it('expands an era to expanded status', async () => {
    const { app } = makeTestApp()
    await importFixture(app)
    const res = await app.request(`/api/branches/${FX.rootBranch}/eras/${FX.era1}/expand`, {
      method: 'POST',
    })
    const { era } = (await res.json()) as { era: unknown }
    const parsed = Era.parse(era)
    expect(parsed.status).toBe('expanded')
    expect(parsed.detail).toBeTruthy()
  })

  it('writes branch-local biographies', async () => {
    const { app } = makeTestApp()
    await importFixture(app)
    const res = await app.request(
      `/api/branches/${FX.childBranch}/entities/${FX.byzantium}/biography`,
      { method: 'POST' },
    )
    expect(res.status).toBe(200)
    const { biography } = (await res.json()) as { biography: unknown }
    const parsed = EntityBiography.parse(biography)
    expect(parsed.branchId).toBe(FX.childBranch)
    expect(parsed.biography).toBeTruthy()
  })

  it('404s expansion of things not visible from the branch', async () => {
    const { app } = makeTestApp()
    await importFixture(app)
    const res = await app.request(`/api/branches/${FX.childBranch}/events/${FX.e4}/expand`, {
      method: 'POST',
    })
    expect(res.status).toBe(404)
  })
})
