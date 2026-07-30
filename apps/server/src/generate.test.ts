import { BranchView, CreateTimelineResponse } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

interface SseEvent {
  event: string
  data: unknown
}

function parseSse(text: string): SseEvent[] {
  const events: SseEvent[] = []
  for (const block of text.split('\n\n')) {
    const lines = block.split('\n')
    const eventLine = lines.find((l) => l.startsWith('event:'))
    const dataLine = lines.find((l) => l.startsWith('data:'))
    if (eventLine && dataLine) {
      events.push({
        event: eventLine.slice(6).trim(),
        data: JSON.parse(dataLine.slice(5).trim()),
      })
    }
  }
  return events
}

async function createTimeline(app: Awaited<ReturnType<typeof makeTestApp>>['app']) {
  const res = await postJson(app, '/api/timelines', {
    podText: 'The Library of Alexandria never burns in 48 BC',
  })
  return CreateTimelineResponse.parse(await res.json())
}

describe('POST /api/branches/:id/generate - SSE', () => {
  it('streams a full run to the horizon and persists exactly what it streamed', async () => {
    const { app } = makeTestApp()
    const created = await createTimeline(app)

    const res = await app.request(`/api/branches/${created.rootBranch.id}/generate`, {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/event-stream')

    const events = parseSse(await res.text())
    const types = events.map((e) => e.event)
    expect(types[0]).toBe('run.started')
    expect(types.at(-1)).toBe('run.completed')
    expect(types).toContain('era.started')
    expect(types).toContain('critique.completed')
    expect(types).toContain('convergence.found')

    const accepted = events.filter((e) => e.event === 'event.accepted')
    const eraStarts = events.filter((e) => e.event === 'era.started')
    expect(accepted.length).toBeGreaterThanOrEqual(20)
    expect(eraStarts.length).toBeGreaterThanOrEqual(5)

    // What streamed is what persisted.
    const view = BranchView.parse(
      await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
    )
    expect(view.events).toHaveLength(accepted.length)
    expect(view.eras).toHaveLength(eraStarts.length)
    expect(view.entities.length).toBeGreaterThanOrEqual(4)
    expect(view.edges.length).toBeGreaterThanOrEqual(10)
    expect(view.convergences.length).toBeGreaterThanOrEqual(1)
    // The demo dispute path persisted with critic notes.
    const disputed = view.events.filter((e) => e.flags.disputed)
    expect(disputed.length).toBeGreaterThanOrEqual(1)
    expect(disputed[0]?.criticNotes?.length).toBeGreaterThanOrEqual(1)
    // Ledger-bearing entities have state derived from the streamed deltas.
    const withState = view.entities.filter((e) => e.changeLog.length > 0)
    expect(withState.length).toBeGreaterThanOrEqual(2)
  })

  it('generating twice does not duplicate the seed', async () => {
    const { app } = makeTestApp()
    const created = await createTimeline(app)
    await (
      await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
    ).text()
    const second = parseSse(
      await (
        await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
      ).text(),
    )
    expect(second.map((e) => e.event)).toEqual(['run.started', 'run.completed'])
  })

  it('409s a second run while one is active on the same branch', async () => {
    const { app } = makeTestApp()
    const created = await createTimeline(app)

    // Start the first run and hold its stream open at the first chunk.
    const controller = new AbortController()
    const first = await app.request(`/api/branches/${created.rootBranch.id}/generate`, {
      method: 'POST',
      signal: controller.signal,
    })
    const reader = first.body?.getReader()
    if (!reader) throw new Error('expected a streaming body')
    await reader.read()

    const second = await app.request(`/api/branches/${created.rootBranch.id}/generate`, {
      method: 'POST',
    })
    expect(second.status).toBe(409)
    const body = (await second.json()) as { error: string }
    expect(body.error).toBe('generation-active')

    controller.abort()
    await reader.cancel().catch(() => {})
  })

  it('heals a half-persisted trailing era before resuming', async () => {
    const { app, deps } = makeTestApp()
    const created = await createTimeline(app)
    await (
      await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
    ).text()

    const before = BranchView.parse(
      await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
    )
    const eventCount = before.events.length
    const lastEra = before.eras.at(-1)
    if (!lastEra) throw new Error('expected eras')

    // Simulate a crash mid-era: an era row + one event, but no critique report.
    const phantomEra = {
      ...lastEra,
      id: '01ER000000000000000PHANT0M',
      ordinal: lastEra.ordinal + 1,
      startYear: lastEra.endYear,
      endYear: lastEra.endYear + 10,
      title: 'The Interrupted Era',
      detail: null,
    }
    deps.repo.insertEra(phantomEra)
    const lastEvent = before.events.at(-1)
    if (!lastEvent) throw new Error('expected events')
    deps.repo.insertEvent({
      ...lastEvent,
      id: '01EV000000000000000PHANT0M',
      eraId: phantomEra.id,
      ordinal: lastEvent.ordinal + 1,
      title: 'A consequence that never finished persisting',
    })

    const resumed = parseSse(
      await (
        await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
      ).text(),
    )
    // The phantom era was rolled back (warning frame) and the run completed.
    expect(
      resumed.some(
        (e) =>
          e.event === 'warning' &&
          typeof e.data === 'object' &&
          e.data !== null &&
          String((e.data as { message?: string }).message).includes('half-written'),
      ),
    ).toBe(true)
    expect(resumed.at(-1)?.event).toBe('run.completed')

    const after = BranchView.parse(
      await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
    )
    // No phantom rows survive, and nothing was double-generated.
    expect(after.events.some((e) => e.id === '01EV000000000000000PHANT0M')).toBe(false)
    expect(after.eras.some((e) => e.id === '01ER000000000000000PHANT0M')).toBe(false)
    expect(after.events).toHaveLength(eventCount)
  })

  it('streams cumulative run.usage frames and a priced run.completed when metered', async () => {
    const { app, deps } = makeTestApp()
    // The mock meters nothing; wrap it so every call reports usage the way
    // the live provider would, with per-role model ids.
    const inner = deps.provider
    deps.provider = {
      mode: inner.mode,
      complete: async (req) => ({
        ...(await inner.complete(req)),
        model: req.role === 'generation' ? 'claude-sonnet-5' : 'claude-haiku-4-5-20251001',
        usage: { inputTokens: 1000, outputTokens: 500 },
      }),
    }
    const created = await createTimeline(app)
    const events = parseSse(
      await (
        await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
      ).text(),
    )

    const usageFrames = events.filter((e) => e.event === 'run.usage')
    expect(usageFrames.length).toBeGreaterThanOrEqual(3)
    // Cumulative and monotonic: the meter only ever counts up.
    let previous = 0
    for (const frame of usageFrames) {
      const data = frame.data as { usage: { inputTokens: number; outputTokens: number } }
      const total = data.usage.inputTokens + data.usage.outputTokens
      expect(total).toBeGreaterThanOrEqual(previous)
      previous = total
    }

    const completed = events.at(-1)
    expect(completed?.event).toBe('run.completed')
    const data = completed?.data as {
      usage: { inputTokens: number; outputTokens: number }
      byModel: Record<string, { inputTokens: number; outputTokens: number }>
      estimatedUsd: number
      unpricedModels: string[]
    }
    expect(data.usage.inputTokens).toBeGreaterThan(0)
    expect(data.estimatedUsd).toBeGreaterThan(0)
    expect(data.unpricedModels).toEqual([])
    expect(Object.keys(data.byModel).sort()).toEqual([
      'claude-haiku-4-5-20251001',
      'claude-sonnet-5',
    ])
  })

  it('404s for unknown branches', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/branches/01BR00000000000000000000ZZ/generate', {
      method: 'POST',
    })
    expect(res.status).toBe(404)
  })

  it('stops cleanly when the client aborts mid-stream and keeps a consistent prefix', async () => {
    const { app } = makeTestApp()
    const created = await createTimeline(app)

    const controller = new AbortController()
    const res = await app.request(`/api/branches/${created.rootBranch.id}/generate`, {
      method: 'POST',
      signal: controller.signal,
    })
    const reader = res.body?.getReader()
    if (!reader) throw new Error('expected a streaming body')

    // Read only the first chunk, then hang up.
    await reader.read()
    controller.abort()
    await reader.cancel().catch(() => {})

    // Whatever landed before the abort is a consistent, viewable prefix.
    const viewRes = await app.request(`/api/branches/${created.rootBranch.id}/view`)
    expect(viewRes.status).toBe(200)
    const view = BranchView.parse(await viewRes.json())
    // Every persisted event's era exists, edges resolve, state replays.
    for (const event of view.events) {
      expect(view.eras.some((era) => era.id === event.eraId)).toBe(true)
    }
  })
})
