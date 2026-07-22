// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import type { EntityView, EventView } from '@uchronia/schemas'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it } from 'vitest'
import { EventCard } from './EventCard.js'
import { PlausibilityStamp } from './Stamp.js'

afterEach(cleanup)

const baseEvent: EventView = {
  id: '01EV0000000000000000000001',
  branchId: '01BR0000000000000000000001',
  eraId: '01ER0000000000000000000001',
  ordinal: 0,
  date: { year: -47, label: '47 BC' },
  title: 'Grain prices shift in the Alexandria markets',
  summary: 'The first measurable consequence arrives where it always does: in prices.',
  detail: null,
  entityIds: ['01EN0000000000000000000001'],
  deltas: [],
  lenses: ['economic', 'daily-life'],
  plausibility: { score: 0.78, rationale: 'Prices move first.' },
  distanceFromPod: 1,
  wildcard: false,
  flags: { disputed: false, convergence: false },
  criticNotes: null,
  provenance: { kind: 'user' },
  causes: [],
  effects: [],
}

const entities = new Map<string, EntityView>([
  [
    '01EN0000000000000000000001',
    {
      id: '01EN0000000000000000000001',
      timelineId: '01TM0000000000000000000001',
      slug: 'ptolemaic-egypt',
      type: 'nation',
      name: 'Ptolemaic Egypt',
      description: 'The riverine power.',
      initialState: {},
      introducedByEventId: null,
      createdAt: '2026-07-22T12:00:00.000Z',
      provenance: { kind: 'user' },
      state: {},
      changeLog: [],
    },
  ],
])

function renderCard(event: EventView, offscreen?: [number, number]) {
  return render(
    <MemoryRouter>
      <EventCard
        event={event}
        entities={entities}
        branchPath="/t/x/b/y"
        offscreenRelations={offscreen}
      />
    </MemoryRouter>,
  )
}

describe('EventCard', () => {
  it('renders date, title, summary, entity chips, and the plausibility stamp', () => {
    renderCard(baseEvent)
    expect(screen.getByText('47 BC')).toBeDefined()
    expect(screen.getByRole('link', { name: baseEvent.title })).toBeDefined()
    expect(screen.getByText(/first measurable consequence/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ptolemaic Egypt' })).toBeDefined()
    expect(screen.getByTestId('plausibility-stamp').textContent).toBe('plausibility 0.78')
  })

  it('shows disputed and convergence marks when flagged', () => {
    renderCard({
      ...baseEvent,
      flags: { disputed: true, convergence: true },
      criticNotes: [{ type: 'teleology', severity: 'fail', note: 'written toward an ending' }],
    })
    expect(screen.getByTestId('disputed-mark').textContent).toContain('disputed')
    expect(screen.getByTestId('convergence-glyph').textContent).toContain('convergence')
  })

  it('reports off-screen causal relations honestly', () => {
    renderCard(baseEvent, [2, 1])
    expect(screen.getByText(/2 ↑/)).toBeDefined()
    expect(screen.getByText(/1 ↓/)).toBeDefined()
  })
})

describe('PlausibilityStamp', () => {
  it('always shows two decimals, like an archival mark', () => {
    render(<PlausibilityStamp score={0.5} />)
    expect(screen.getByTestId('plausibility-stamp').textContent).toBe('plausibility 0.50')
  })
})
