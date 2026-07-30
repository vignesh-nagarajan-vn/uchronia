import { Artifact, AskResponse, BranchView, CreateTimelineResponse } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * Interrogation (v2/M23). The thing being tested is not the prose: it is that
 * every answer is made of rows this branch actually holds, and that the pins
 * in the text resolve to those rows. An answer whose citations went nowhere
 * would be indistinguishable from one that made them up.
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

describe('ask the archivist (v2/M23)', () => {
  it('answers from the record and cites rows this branch actually holds', async () => {
    const { app, branchId, view } = await derived()
    const res = await postJson(app, `/api/branches/${branchId}/ask`, {
      question: 'what did the reform cost, and who paid for it?',
    })
    expect(res.status).toBe(200)
    const answer = AskResponse.parse(await res.json())
    expect(answer.answer.length).toBeGreaterThan(20)

    const eventIds = new Set(view.events.map((e) => e.id))
    const artifactIds = new Set(view.artifacts.map((a) => a.id))
    const claimIds = new Set(view.claims.map((c) => c.id))
    for (const citation of answer.citations) {
      const pool =
        citation.kind === 'event' ? eventIds : citation.kind === 'artifact' ? artifactIds : claimIds
      expect(pool.has(citation.id), `${citation.pin} resolves`).toBe(true)
      // The pin has to actually appear in the prose it is supposed to support.
      expect(answer.answer).toContain(`[${citation.pin}]`)
    }
  })

  it('never returns a citation the answer did not use', async () => {
    const { app, branchId } = await derived()
    const answer = AskResponse.parse(
      await (
        await postJson(app, `/api/branches/${branchId}/ask`, { question: 'what happened here?' })
      ).json(),
    )
    const pinsInText = new Set([...answer.answer.matchAll(/\[([EAC]\d+)\]/g)].map((m) => m[1]))
    for (const citation of answer.citations) expect(pinsInText.has(citation.pin)).toBe(true)
    expect(answer.citations.length).toBeLessThanOrEqual(pinsInText.size)
  })

  it('persists nothing: a question belongs to the reader', async () => {
    const { app, branchId, view } = await derived()
    await postJson(app, `/api/branches/${branchId}/ask`, { question: 'who ended up paying?' })
    const after = BranchView.parse(
      await (await app.request(`/api/branches/${branchId}/view`)).json(),
    )
    expect(after.artifacts.length).toBe(view.artifacts.length)
    expect(after.events.length).toBe(view.events.length)
  })

  it('refuses a question too short to be one', async () => {
    const { app, branchId } = await derived()
    const res = await postJson(app, `/api/branches/${branchId}/ask`, { question: 'x' })
    expect(res.status).toBe(400)
  })
})

describe('the grand inquiry (v2/M23)', () => {
  it('returns a finding, saves it to the shelf, and cites its chain', async () => {
    const { app, branchId, view } = await derived()
    const res = await postJson(app, `/api/branches/${branchId}/inquiry`, {
      thesis: 'The survival of the library mattered less than the money that kept it open.',
    })
    expect(res.status).toBe(201)
    const artifact = Artifact.parse(((await res.json()) as { artifact: unknown }).artifact)
    expect(artifact.kind).toBe('inquiry')
    if (artifact.body.kind !== 'inquiry') throw new Error('wrong body')

    expect(artifact.body.verdict.length).toBeGreaterThan(10)
    expect(artifact.body.confidence).toBeGreaterThanOrEqual(0)
    expect(artifact.body.confidence).toBeLessThanOrEqual(1)
    expect(artifact.body.chain.length).toBeGreaterThanOrEqual(1)
    // A finding with no counter-considerations is a finding nobody checked.
    expect(artifact.body.counterConsiderations.length).toBeGreaterThanOrEqual(1)
    // Every cited pin appears in the chain that used it.
    const chainPins = new Set(artifact.body.chain.map((s) => s.pin))
    for (const citation of artifact.body.citations) expect(chainPins.has(citation.pin)).toBe(true)

    // It is on the shelf and travels with the branch.
    const after = BranchView.parse(
      await (await app.request(`/api/branches/${branchId}/view`)).json(),
    )
    expect(after.artifacts.length).toBe(view.artifacts.length + 1)
    expect(after.artifacts.some((a) => a.id === artifact.id)).toBe(true)
  })

  it('refuses a thesis too short to adjudicate', async () => {
    const { app, branchId } = await derived()
    const res = await postJson(app, `/api/branches/${branchId}/inquiry`, { thesis: 'maybe' })
    expect(res.status).toBe(400)
  })
})
