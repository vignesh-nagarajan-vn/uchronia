import { CreateTimelineResponse } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

interface TraceRow {
  id: string
  runId: string | null
  templateId: string
  ok: boolean
  attempts: number
  estimatedUsd: number
}

async function derive(app: Awaited<ReturnType<typeof makeTestApp>>['app']) {
  const created = CreateTimelineResponse.parse(
    await (
      await postJson(app, '/api/timelines', {
        podText: 'The Library of Alexandria never burns in 48 BC',
      })
    ).json(),
  )
  await (
    await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
  ).text()
  return created
}

describe('the engine room (v2/M15)', () => {
  it('records one trace per structured call during a run, inspectable in full', async () => {
    const { app } = makeTestApp()
    const created = await derive(app)

    const res = await app.request(`/api/branches/${created.rootBranch.id}/traces`)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { tracing: boolean; traces: TraceRow[] }
    expect(body.tracing).toBe(true)
    // A full mock run makes many calls: seed + per-era pressures/generate/critic/scan.
    expect(body.traces.length).toBeGreaterThanOrEqual(10)
    expect(body.traces.every((t) => t.ok)).toBe(true)
    const templates = new Set(body.traces.map((t) => t.templateId))
    for (const expected of [
      'seed-consequences',
      'derive-pressures',
      'era-generate',
      'critic-review',
    ]) {
      expect(templates.has(expected), expected).toBe(true)
    }
    // All calls of the run share one runId.
    const runIds = new Set(body.traces.map((t) => t.runId).filter((r) => r !== null))
    expect(runIds.size).toBe(1)

    const detail = await app.request(`/api/traces/${body.traces[0]?.id}`)
    expect(detail.status).toBe(200)
    const { trace } = (await detail.json()) as {
      trace: { prompt: string; response: string; system: string }
    }
    expect(trace.prompt.length).toBeGreaterThan(0)
    expect(trace.response.length).toBeGreaterThan(0)
    expect(trace.system.length).toBeGreaterThan(0)
  })

  it('files one-off calls (expanders) under the null run bucket', async () => {
    const { app } = makeTestApp()
    const created = await derive(app)
    const view = (await (
      await app.request(`/api/branches/${created.rootBranch.id}/view`)
    ).json()) as { events: Array<{ id: string }> }
    const eventId = view.events[0]?.id
    await app.request(`/api/branches/${created.rootBranch.id}/events/${eventId}/expand`, {
      method: 'POST',
    })
    const body = (await (
      await app.request(`/api/branches/${created.rootBranch.id}/traces`)
    ).json()) as { traces: TraceRow[] }
    const oneOffs = body.traces.filter((t) => t.runId === null)
    expect(oneOffs.some((t) => t.templateId === 'event-expand')).toBe(true)
  })

  it('prunes to the configured run retention', async () => {
    const { app, deps } = makeTestApp()
    const created = await derive(app)
    // Fabricate an older run's traces, then let a prune with retention 1 fire.
    deps.repo.insertTrace({
      id: '01TR000000000000000000OLD0',
      branchId: created.rootBranch.id,
      runId: '01RN000000000000000000OLD0',
      templateId: 'era-generate',
      templateVersion: '1.4.0',
      role: 'generation',
      model: 'mock',
      system: 's',
      prompt: 'p',
      response: 'r',
      inputTokens: 1,
      outputTokens: 1,
      cacheReadTokens: null,
      cacheWriteTokens: null,
      attempts: 1,
      validationIssues: [],
      ok: true,
      error: null,
      durationMs: 0,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    deps.repo.pruneTraces(created.rootBranch.id, 1)
    const body = (await (
      await app.request(`/api/branches/${created.rootBranch.id}/traces`)
    ).json()) as { traces: TraceRow[] }
    expect(body.traces.some((t) => t.runId === '01RN000000000000000000OLD0')).toBe(false)
    expect(body.traces.length).toBeGreaterThan(0)
  })

  it('404s unknown branches and traces', async () => {
    const { app } = makeTestApp()
    expect((await app.request('/api/branches/01BR00000000000000000000ZZ/traces')).status).toBe(404)
    expect((await app.request('/api/traces/01TR00000000000000000000ZZ')).status).toBe(404)
  })
})
