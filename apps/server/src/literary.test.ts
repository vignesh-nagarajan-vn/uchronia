import {
  Artifact,
  BranchView,
  CreateTimelineResponse,
  FORGEABLE_ARTIFACT_KINDS,
} from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * The literary surface (v2/M20): the forge's second shelf, the arms, and the
 * argument a history has about itself. Everything here must work keyless,
 * because a reader without a key is exactly who these surfaces are for.
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
  const branchId = created.rootBranch.id
  await (await app.request(`/api/branches/${branchId}/generate`, { method: 'POST' })).text()
  const view = BranchView.parse(await (await app.request(`/api/branches/${branchId}/view`)).json())
  return { app, branchId, view }
}

describe('the artifact forge, second shelf (v2/M20)', () => {
  it('forges every declared kind keyless, and each parses as its own body', async () => {
    const { app, branchId, view } = await derived()
    const event = view.events[3]
    expect(event).toBeDefined()

    for (const kind of FORGEABLE_ARTIFACT_KINDS) {
      const res = await postJson(app, `/api/branches/${branchId}/events/${event?.id}/artifacts`, {
        kind,
      })
      expect(res.status, `${kind} should forge`).toBe(201)
      const artifact = Artifact.parse(((await res.json()) as { artifact: unknown }).artifact)
      expect(artifact.kind).toBe(kind)
      expect(artifact.body.kind).toBe(kind)
      expect(artifact.title.length).toBeGreaterThan(0)
    }
  })

  it('keeps a telegram in the register its form imposes', async () => {
    const { app, branchId, view } = await derived()
    const res = await postJson(
      app,
      `/api/branches/${branchId}/events/${view.events[2]?.id}/artifacts`,
      { kind: 'telegram' },
    )
    const artifact = Artifact.parse(((await res.json()) as { artifact: unknown }).artifact)
    if (artifact.body.kind !== 'telegram') throw new Error('wrong body')
    // Clauses, not sentences: a wire is charged by the word.
    expect(artifact.body.words.length).toBeGreaterThanOrEqual(2)
    for (const word of artifact.body.words) expect(word).not.toContain('.')
  })

  it('returns the same document when the same kind is asked for twice', async () => {
    const { app, branchId, view } = await derived()
    const path = `/api/branches/${branchId}/events/${view.events[1]?.id}/artifacts`
    const first = Artifact.parse(
      ((await (await postJson(app, path, { kind: 'obituary' })).json()) as { artifact: unknown })
        .artifact,
    )
    const second = Artifact.parse(
      ((await (await postJson(app, path, { kind: 'obituary' })).json()) as { artifact: unknown })
        .artifact,
    )
    expect(second.id).toBe(first.id)
  })
})

describe('procedural arms over HTTP (v2/M20)', () => {
  it('serves a self-contained, immutable SVG for a slug', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/arms/byzantine-empire')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('image/svg+xml')
    expect(res.headers.get('cache-control')).toContain('immutable')
    const svg = await res.text()
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg.replace(/xmlns="[^"]*"/g, '')).not.toMatch(/https?:|<image|<script/)
  })

  it('is stable for a slug and different across slugs', async () => {
    const { app } = makeTestApp()
    const a = await (await app.request('/api/arms/byzantine-empire')).text()
    const again = await (await app.request('/api/arms/byzantine-empire')).text()
    const other = await (await app.request('/api/arms/the-ottomans')).text()
    expect(again).toBe(a)
    expect(other).not.toBe(a)
  })

  it('refuses a slug that is not one', async () => {
    const { app } = makeTestApp()
    expect((await app.request('/api/arms/../../etc/passwd')).status).toBeGreaterThanOrEqual(400)
    expect((await app.request('/api/arms/Not A Slug')).status).toBeGreaterThanOrEqual(400)
  })
})

describe('in-world historiography (v2/M20)', () => {
  it('derives rival schools once and reads an event through all of them', async () => {
    const { app, branchId, view } = await derived()
    const eventId = view.events[4]?.id
    const res = await postJson(
      app,
      `/api/branches/${branchId}/events/${eventId}/interpretations`,
      {},
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      schools: Array<{ id: string; name: string; blindSpot: string }>
      interpretations: Array<{ eventId: string; schoolId: string; gloss: string }>
    }
    expect(body.schools.length).toBeGreaterThanOrEqual(2)
    expect(body.interpretations.length).toBe(body.schools.length)
    // Every school has a blind spot; a school without one is a mood.
    for (const school of body.schools) expect(school.blindSpot.length).toBeGreaterThan(0)
    // Each gloss belongs to a real school and to the event asked about.
    const ids = new Set(body.schools.map((s) => s.id))
    for (const gloss of body.interpretations) {
      expect(ids.has(gloss.schoolId)).toBe(true)
      expect(gloss.eventId).toBe(eventId)
      expect(gloss.gloss.length).toBeGreaterThan(40)
    }
    // And they disagree: identical glosses would defeat the whole point.
    expect(new Set(body.interpretations.map((g) => g.gloss)).size).toBe(body.interpretations.length)
  })

  it('is fill-once: asking again returns what was already written', async () => {
    const { app, branchId, view } = await derived()
    const path = `/api/branches/${branchId}/events/${view.events[4]?.id}/interpretations`
    const first = (await (await postJson(app, path, {})).json()) as {
      interpretations: Array<{ id: string }>
    }
    const second = (await (await postJson(app, path, {})).json()) as {
      interpretations: Array<{ id: string }>
    }
    expect(second.interpretations.map((i) => i.id)).toEqual(first.interpretations.map((i) => i.id))

    // And the branch view carries them, so a reader who comes back sees them.
    const view2 = BranchView.parse(
      await (await app.request(`/api/branches/${branchId}/view`)).json(),
    )
    expect(view2.schools.length).toBeGreaterThanOrEqual(2)
    expect(view2.interpretations.length).toBe(first.interpretations.length)
  })

  it('404s an event the branch cannot see', async () => {
    const { app, branchId } = await derived()
    const res = await postJson(
      app,
      `/api/branches/${branchId}/events/01EV0000000000000000000404/interpretations`,
      {},
    )
    expect(res.status).toBe(404)
  })
})
