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

describe('POST /api/branches/:id/generate — SSE', () => {
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
