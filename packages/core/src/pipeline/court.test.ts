import type { CourtRulingOut, DraftEvent, Era, Timeline } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { dialParams } from '../dial.js'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { World } from '../world.js'
import { refineBatch } from './critic.js'
import type { PipelineCtx } from './ctx.js'

const NOW = '2026-07-22T12:00:00.000Z'

const provenance = {
  kind: 'generated',
  model: 'mock',
  templateId: 't',
  templateVersion: '1',
  generatedAt: NOW,
  mode: 'mock',
} as const

/**
 * The mock judge picks its outcome from the seeded rng, which is exactly what
 * a demo wants and exactly what a test cannot assert on. These cases pin the
 * ruling with an injected handler and check what the pipeline does with it.
 */
function setup(ruling: CourtRulingOut, court = true): { world: World; era: Era; ctx: PipelineCtx } {
  const aggregate = fixtureAggregate()
  const timeline: Timeline = {
    ...aggregate.timeline,
    settings: { ...aggregate.timeline.settings, court },
  }
  const world = World.fromAggregate({ ...aggregate, timeline })
  const era: Era = {
    id: '01ER00000000000000000000C1',
    branchId: FX.rootBranch,
    ordinal: 2,
    startYear: 1470,
    endYear: 1485,
    title: 'The Years On Trial',
    summary: 'A span invented for the court tests.',
    pressures: [],
    status: 'skeleton',
    detail: null,
    speculative: false,
    provenance,
  }
  const ctx: PipelineCtx = {
    provider: new MockProvider({ 'court-judge': () => ruling }),
    idgen: sequentialIdGen('CT'),
    clock: fixedClock(NOW),
  }
  return { world, era, ctx }
}

/** A draft the critic reliably disputes: a lone person moving armies by charm. */
function disputedDraft(): DraftEvent {
  return {
    ref: 'd1',
    year: 1472,
    dateLabel: '1472',
    title: 'A lone envoy annexes the Morea',
    summary:
      'Through personal charm alone, an envoy persuades three garrisons to change allegiance.',
    lenses: ['political'],
    entitySlugs: ['byzantine-empire'],
    newEntities: [],
    deltas: [
      {
        entitySlug: 'byzantine-empire',
        patch: [{ key: 'morea', value: 'reattached 1472' }],
        note: 'A province returns to the ledger.',
      },
    ],
    causes: [{ ref: 'e3', kind: 'causes', strength: 0.6 }],
    plausibility: { score: 0.3, rationale: 'It would be a great story.' },
    wildcard: false,
  }
}

async function hear(ruling: CourtRulingOut) {
  const { world, era, ctx } = setup(ruling)
  return refineBatch({
    ctx,
    world,
    branchId: FX.rootBranch,
    era,
    drafts: [disputedDraft()],
    dial: dialParams(50),
    provenance,
  })
}

describe('the Court of Plausibility (v2/M17)', () => {
  it('clears the dispute when the court upholds the event', async () => {
    const refined = await hear({
      outcome: 'uphold',
      opinion: 'The causes cited are sufficient at this determinism.',
      instruction: null,
    })
    expect(refined.batch.events[0]?.flags.disputed).toBe(false)
    expect(refined.verdicts[0]?.verdict).toBe('pass')
    expect(refined.courtRecords).toHaveLength(1)
    expect(refined.courtRecords[0]?.ruling.outcome).toBe('uphold')
  })

  it('keeps the mark and the transcript when the court cannot reconcile the briefs', async () => {
    const refined = await hear({
      outcome: 'dispute',
      opinion: 'The causes neither carry the event nor exclude it.',
      instruction: null,
    })
    const event = refined.batch.events[0]
    expect(event?.flags.disputed).toBe(true)
    expect(refined.verdicts[0]?.verdict).toBe('dispute')
    const record = refined.courtRecords[0]
    expect(record?.ruling.outcome).toBe('dispute')
    expect(record?.eventId).toBe(event?.id)
    expect(record?.advocate.length).toBeGreaterThan(0)
    expect(record?.skeptic.length).toBeGreaterThan(0)
  })

  it('orders one retelling when the court finds the narrower point proven', async () => {
    const refined = await hear({
      outcome: 'revise',
      opinion: 'Reachable, but not yet reached on the page.',
      instruction: 'Name the intermediate step that carries the outcome.',
    })
    expect(refined.courtRecords[0]?.ruling.outcome).toBe('revise')
    // The mock retelling is machine-clean, so the retold event stands undisputed.
    expect(refined.batch.events[0]?.flags.disputed).toBe(false)
    expect(refined.batch.events).toHaveLength(1)
  })

  it('never sits at all when the court is switched off', async () => {
    const { world, era, ctx } = setup(
      { outcome: 'uphold', opinion: 'unused', instruction: null },
      false,
    )
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [disputedDraft()],
      dial: dialParams(50),
      provenance,
    })
    expect(refined.courtRecords).toEqual([])
    expect(refined.batch.events[0]?.flags.disputed).toBe(true)
  })
})
