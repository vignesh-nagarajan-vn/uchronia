import { BranchView, CreateTimelineResponse, TimelineAggregate } from '@uchronia/schemas'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * Symposium derivation and the Court of Plausibility, end to end through the
 * HTTP surface (v2/M17): the settings survive creation, the run streams the
 * new frames, and the transcripts come back on the branch view and the export.
 */

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
      events.push({ event: eventLine.slice(6).trim(), data: JSON.parse(dataLine.slice(5).trim()) })
    }
  }
  return events
}

async function derive(body: Record<string, unknown>) {
  const { app } = makeTestApp()
  const created = CreateTimelineResponse.parse(
    await (
      await postJson(app, '/api/timelines', {
        podText: 'The Library of Alexandria never burns in 48 BC',
        horizonYears: 60,
        ...body,
      })
    ).json(),
  )
  const stream = parseSse(
    await (
      await app.request(`/api/branches/${created.rootBranch.id}/generate`, { method: 'POST' })
    ).text(),
  )
  const view = BranchView.parse(
    await (await app.request(`/api/branches/${created.rootBranch.id}/view`)).json(),
  )
  return { app, created, stream, view }
}

describe('symposium derivation over HTTP (v2/M17)', () => {
  it('keeps the derivation settings the composer sent', async () => {
    const { created } = await derive({
      derivation: 'symposium',
      court: true,
      axes: { greatPersonWeight: 90, techVolatility: 10, culturalDrift: 50, chaosEvents: true },
    })
    expect(created.timeline.settings.derivation).toBe('symposium')
    expect(created.timeline.settings.court).toBe(true)
    expect(created.timeline.settings.axes?.greatPersonWeight).toBe(90)
  })

  it('defaults to standard derivation with no court when the composer says nothing', async () => {
    const { created, view } = await derive({})
    expect(created.timeline.settings.derivation).toBe('standard')
    expect(created.timeline.settings.court).toBe(false)
    expect(view.courtRecords).toEqual([])
    expect(view.events.every((e) => !e.flags.contested)).toBe(true)
  })

  it('marks contested events when the symposium sits', async () => {
    const { view } = await derive({ derivation: 'symposium' })
    const contested = view.events.filter((e) => e.flags.contested)
    expect(contested.length).toBeGreaterThanOrEqual(1)
    expect(contested[0]?.criticNotes?.some((n) => n.type === 'contested')).toBe(true)
  })

  it('persists court transcripts, streams them, and exports them', async () => {
    const { app, created, stream, view } = await derive({ court: true })
    const streamed = stream.filter((e) => e.event === 'court.completed')
    expect(streamed.length).toBeGreaterThanOrEqual(1)
    expect(view.courtRecords.length).toBe(streamed.length)

    const record = view.courtRecords[0]
    expect(record).toBeDefined()
    expect(record?.advocate.length).toBeGreaterThan(0)
    expect(record?.skeptic.length).toBeGreaterThan(0)
    expect(['uphold', 'revise', 'dispute']).toContain(record?.ruling.outcome)
    // Every transcript hangs off an event actually visible on this branch.
    const eventIds = new Set(view.events.map((e) => e.id))
    for (const r of view.courtRecords) expect(eventIds.has(r.eventId)).toBe(true)

    const exported = TimelineAggregate.parse(
      await (await app.request(`/api/timelines/${created.timeline.id}/export.json`)).json(),
    )
    expect(exported.courtRecords.length).toBe(view.courtRecords.length)
  })

  it('re-imports an exported chronicle carrying court records', async () => {
    const { app, created } = await derive({ court: true })
    const exported = TimelineAggregate.parse(
      await (await app.request(`/api/timelines/${created.timeline.id}/export.json`)).json(),
    )
    const { app: fresh } = makeTestApp()
    const imported = await postJson(fresh, '/api/import', exported)
    expect(imported.status).toBe(201)
    const round = TimelineAggregate.parse(
      await (await fresh.request(`/api/timelines/${created.timeline.id}/export.json`)).json(),
    )
    expect(round.courtRecords.length).toBe(exported.courtRecords.length)
  })
})
