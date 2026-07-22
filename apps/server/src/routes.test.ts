import {
  BranchView,
  ConfigResponse,
  CreateTimelineResponse,
  TimelineAggregate,
} from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

describe('meta routes', () => {
  it('serves config without ever exposing key material', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/config')
    expect(res.status).toBe(200)
    const config = ConfigResponse.parse(await res.json())
    expect(config.mock).toBe(true)
    expect(config.keyConfigured).toBe(false)
    expect(JSON.stringify(config)).not.toMatch(/sk-/)
  })

  it('serves the curated baseline', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/baseline')
    const body = (await res.json()) as { provenance: string; anchors: unknown[] }
    expect(body.provenance).toBe('curated')
    expect(body.anchors.length).toBeGreaterThanOrEqual(3)
  })
})

describe('POST /api/timelines — pod intake', () => {
  it('creates a timeline with a normalized pod and root branch', async () => {
    const { app } = makeTestApp()
    const res = await postJson(app, '/api/timelines', {
      podText: 'The Library of Alexandria never burns in 48 BC',
      dial: 30,
    })
    expect(res.status).toBe(201)
    const created = CreateTimelineResponse.parse(await res.json())
    expect(created.pod.year).toBe(-48)
    expect(created.pod.mechanism).toBe('knowledge')
    expect(created.pod.raw).toBe('The Library of Alexandria never burns in 48 BC')
    expect(created.timeline.settings.dial).toBe(30)
    expect(created.timeline.settings.models.mode).toBe('mock')
    expect(created.rootBranch.parentBranchId).toBeNull()

    const list = (await (await app.request('/api/timelines')).json()) as Array<{ id: string }>
    expect(list.map((t) => t.id)).toContain(created.timeline.id)
  })

  it('rejects bodies that fail validation', async () => {
    const { app } = makeTestApp()
    const res = await postJson(app, '/api/timelines', { podText: 'ab' })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string; issues: string[] }
    expect(body.error).toBe('invalid-request')
    expect(body.issues.join(' ')).toContain('podText')
  })
})

describe('aggregate round-trip through the API', () => {
  it('imports, reads, exports, and deletes a full timeline', async () => {
    const { app } = makeTestApp()

    const imported = await postJson(app, '/api/import', fixtureAggregate())
    expect(imported.status).toBe(201)

    const got = await app.request(`/api/timelines/${FX.timeline}`)
    expect(got.status).toBe(200)
    const aggregate = TimelineAggregate.parse(await got.json())
    expect(aggregate.events).toHaveLength(6)
    expect(aggregate.artifacts).toHaveLength(1)

    const exported = await app.request(`/api/timelines/${FX.timeline}/export.json`)
    expect(exported.headers.get('content-disposition')).toContain('attachment')
    TimelineAggregate.parse(await exported.json())

    const del = await app.request(`/api/timelines/${FX.timeline}`, { method: 'DELETE' })
    expect(del.status).toBe(204)
    expect((await app.request(`/api/timelines/${FX.timeline}`)).status).toBe(404)
    // Delete is complete: reimport works.
    expect((await postJson(app, '/api/import', fixtureAggregate())).status).toBe(201)
  })

  it('refuses duplicate imports', async () => {
    const { app } = makeTestApp()
    await postJson(app, '/api/import', fixtureAggregate())
    const again = await postJson(app, '/api/import', fixtureAggregate())
    expect(again.status).toBe(409)
  })

  it('rejects malformed aggregates', async () => {
    const { app } = makeTestApp()
    const broken = fixtureAggregate()
    const event = broken.events[0]
    if (!event) throw new Error('fixture missing')
    event.plausibility.score = 3
    const res = await postJson(app, '/api/import', broken)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/branches/:id/view', () => {
  it('resolves the child branch through the fork', async () => {
    const { app } = makeTestApp()
    await postJson(app, '/api/import', fixtureAggregate())

    const res = await app.request(`/api/branches/${FX.childBranch}/view`)
    expect(res.status).toBe(200)
    const view = BranchView.parse(await res.json())

    expect(view.events.map((e) => e.id)).toEqual([FX.e0, FX.e1, FX.e2, FX.e5])
    expect(view.eras.map((e) => e.id)).toEqual([FX.era0, FX.childEra])
    // Derived adjacency present on the inherited fork event.
    const e2 = view.events.find((e) => e.id === FX.e2)
    expect(e2?.effects).toContain(FX.edge25)
    // Branch-local entity state.
    const byzantium = view.entities.find((e) => e.id === FX.byzantium)
    expect(byzantium?.state.church).toBe('union enforced')
    expect(view.entities.map((e) => e.id)).not.toContain(FX.peraPress)
  })

  it('404s unknown branches', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/branches/01BR00000000000000000000ZZ/view')
    expect(res.status).toBe(404)
  })
})
