import type { DraftEvent, Era } from '@uchronia/schemas'
import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { dialParams } from '../dial.js'
import { MockProvider } from '../mock/provider.js'
import { fixedClock, sequentialIdGen } from '../ports.js'
import { World } from '../world.js'
import { refineBatch } from './critic.js'
import type { PipelineCtx } from './ctx.js'

const NOW = '2026-07-22T12:00:00.000Z'

function setup(): { world: World; era: Era; ctx: PipelineCtx } {
  const world = World.fromAggregate(fixtureAggregate())
  const era: Era = {
    id: '01ER00000000000000000000M4',
    branchId: FX.rootBranch,
    ordinal: 2,
    startYear: 1470,
    endYear: 1485,
    title: 'The Testing Years',
    summary: 'A span invented for the dual-review tests.',
    pressures: [],
    status: 'skeleton',
    detail: null,
    provenance: {
      kind: 'generated',
      model: 'mock',
      templateId: 't',
      templateVersion: '1',
      generatedAt: NOW,
      mode: 'mock',
    },
  }
  const ctx: PipelineCtx = {
    provider: new MockProvider(),
    idgen: sequentialIdGen('M4'),
    clock: fixedClock(NOW),
  }
  return { world, era, ctx }
}

function draft(overrides: Partial<DraftEvent> & { ref: string }): DraftEvent {
  return {
    year: 1472,
    dateLabel: '1472',
    title: 'A quiet reform of the customs house',
    summary: 'The customs farm is rebid; Venetian clerks lose three sinecures and keep the rest.',
    lenses: ['economic'],
    entitySlugs: ['byzantine-empire'],
    newEntities: [],
    deltas: [
      {
        entitySlug: 'byzantine-empire',
        patch: [{ key: 'customsRegime', value: 'rebid 1472' }],
        note: 'The ledger changes hands, slightly.',
      },
    ],
    causes: [{ ref: 'e3', kind: 'causes', strength: 0.6 }],
    plausibility: {
      score: 0.7,
      rationale: 'Administrative churn is the cheapest kind of history.',
    },
    wildcard: false,
    ...overrides,
  }
}

describe('refineBatch - dual review (§P4)', () => {
  it('passes a clean batch through untouched', async () => {
    const { world, era, ctx } = setup()
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [draft({ ref: 'd1' })],
      dial: dialParams(50),
      provenance: {
        kind: 'generated',
        model: 'mock',
        templateId: 't',
        templateVersion: '1',
        generatedAt: NOW,
        mode: 'mock',
      },
    })
    expect(refined.batch.events).toHaveLength(1)
    expect(refined.batch.events[0]?.flags.disputed).toBe(false)
    expect(refined.droppedRefs).toEqual([])
    expect(refined.verdicts.every((v) => v.verdict === 'pass')).toBe(true)
  })

  it('regenerates a critic-flagged draft and commits the repaired version', async () => {
    const { world, era, ctx } = setup()
    const flawed = draft({
      ref: 'd1',
      title: 'The market falls apart',
      summary: 'Suddenly the grain market collapses and panic spreads through the city.',
    })
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [flawed, draft({ ref: 'd2', year: 1473 })],
      dial: dialParams(50),
      provenance: {
        kind: 'generated',
        model: 'mock',
        templateId: 't',
        templateVersion: '1',
        generatedAt: NOW,
        mode: 'mock',
      },
    })
    // The repair removed the cliche marker; the event commits clean, not disputed.
    const repaired = refined.batch.events.find((e) => e.title === 'The market falls apart')
    expect(repaired).toBeDefined()
    expect(repaired?.summary).not.toMatch(/suddenly/i)
    expect(repaired?.summary).toMatch(/over the following season/i)
    expect(repaired?.flags.disputed).toBe(false)
    expect(refined.droppedRefs).toEqual([])
  })

  it('keeps but visibly disputes what the critic rejects outright', async () => {
    const { world, era, ctx } = setup()
    const implausible = draft({
      ref: 'd1',
      title: 'A lone envoy annexes the Morea',
      summary:
        'Through personal charm alone, an envoy persuades three garrisons to change allegiance.',
      plausibility: { score: 0.3, rationale: 'It would be a great story.' },
    })
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [implausible],
      dial: dialParams(50),
      provenance: {
        kind: 'generated',
        model: 'mock',
        templateId: 't',
        templateVersion: '1',
        generatedAt: NOW,
        mode: 'mock',
      },
    })
    expect(refined.droppedRefs).toEqual([])
    const event = refined.batch.events[0]
    expect(event?.flags.disputed).toBe(true)
    expect(event?.criticNotes?.some((i) => i.type === 'implausible-leap')).toBe(true)
    expect(refined.verdicts[0]?.verdict).toBe('dispute')
  })

  it('drops drafts the machine validator still rejects after bounded retries', async () => {
    const { world, era, ctx } = setup()
    // Year far outside the era; the mock repair never touches years.
    const outOfEra = draft({ ref: 'd1', year: 1600, dateLabel: '1600' })
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [outOfEra, draft({ ref: 'd2' })],
      dial: dialParams(50),
      provenance: {
        kind: 'generated',
        model: 'mock',
        templateId: 't',
        templateVersion: '1',
        generatedAt: NOW,
        mode: 'mock',
      },
    })
    expect(refined.droppedRefs).toEqual(['d1'])
    expect(refined.batch.events).toHaveLength(1)
    expect(refined.warnings.some((w) => w.includes('machine rules still failing'))).toBe(true)
  })

  it('carries on-divergence drift verdicts through to visible disputes (v2/M14)', async () => {
    const { world, era } = setup()
    // A critic that flags generic period drift: the fixture case is an event
    // that would read identically in a history without the divergence.
    const ctx = {
      provider: new MockProvider({
        'critic-review': (rawArgs: unknown) => {
          const { drafts } = rawArgs as { drafts: Array<{ ref: string }> }
          return {
            verdicts: drafts.map((d) => ({
              ref: d.ref,
              verdict: 'dispute',
              issues: [
                {
                  type: 'on-divergence',
                  severity: 'fail',
                  note: 'generic period content: no thread of consequence back to the divergence',
                },
              ],
            })),
          }
        },
      }),
      idgen: sequentialIdGen('DV'),
      clock: fixedClock(NOW),
    }
    const generic = draft({
      ref: 'd1',
      title: 'A tax assessment proceeds on schedule',
      summary: 'The customary assessment is carried out as it is every seventh year.',
    })
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [generic],
      dial: dialParams(50),
      provenance: {
        kind: 'generated',
        model: 'mock',
        templateId: 't',
        templateVersion: '1',
        generatedAt: NOW,
        mode: 'mock',
      },
    })
    expect(refined.droppedRefs).toEqual([])
    const event = refined.batch.events[0]
    expect(event?.flags.disputed).toBe(true)
    expect(event?.criticNotes?.some((i) => i.type === 'on-divergence')).toBe(true)
  })

  it('discards wildcards below the dial plausibility floor before review', async () => {
    const { world, era, ctx } = setup()
    const wildcard = draft({
      ref: 'd1',
      title: 'A comet cult seizes the arsenal',
      wildcard: true,
      plausibility: { score: 0.2, rationale: 'Stranger things, but not many.' },
    })
    const refined = await refineBatch({
      ctx,
      world,
      branchId: FX.rootBranch,
      era,
      drafts: [wildcard, draft({ ref: 'd2' })],
      dial: dialParams(90), // railroad: floor ≈ 0.42
      provenance: {
        kind: 'generated',
        model: 'mock',
        templateId: 't',
        templateVersion: '1',
        generatedAt: NOW,
        mode: 'mock',
      },
    })
    expect(refined.batch.events).toHaveLength(1)
    expect(refined.warnings.some((w) => w.includes('plausibility floor'))).toBe(true)
  })
})
