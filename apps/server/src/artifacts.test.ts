import { Artifact, BranchView } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

describe('artifact route', () => {
  it('generates, persists, and dedupes artifacts per (event, kind)', async () => {
    const { app } = makeTestApp()
    await postJson(app, '/api/import', fixtureAggregate())

    const res = await postJson(app, `/api/branches/${FX.rootBranch}/events/${FX.e0}/artifacts`, {
      kind: 'encyclopedia',
    })
    expect(res.status).toBe(201)
    const { artifact } = (await res.json()) as { artifact: unknown }
    const parsed = Artifact.parse(artifact)
    expect(parsed.body.kind).toBe('encyclopedia')

    // Persisted: shows up in the branch view's artifact shelf.
    const view = BranchView.parse(
      await (await app.request(`/api/branches/${FX.rootBranch}/view`)).json(),
    )
    expect(view.artifacts.some((a) => a.id === parsed.id)).toBe(true)

    // Second ask returns the same document, 200.
    const again = await postJson(app, `/api/branches/${FX.rootBranch}/events/${FX.e0}/artifacts`, {
      kind: 'encyclopedia',
    })
    expect(again.status).toBe(200)
    const { artifact: second } = (await again.json()) as { artifact: unknown }
    expect(Artifact.parse(second).id).toBe(parsed.id)
  })

  it('rejects unknown kinds', async () => {
    const { app } = makeTestApp()
    await postJson(app, '/api/import', fixtureAggregate())
    const res = await postJson(app, `/api/branches/${FX.rootBranch}/events/${FX.e0}/artifacts`, {
      kind: 'papyrus',
    })
    expect(res.status).toBe(400)
  })
})
