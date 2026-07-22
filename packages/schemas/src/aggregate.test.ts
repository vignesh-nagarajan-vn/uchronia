import { describe, expect, it } from 'vitest'
import { TimelineAggregate } from './aggregate.js'
import { ArtifactBody } from './artifact.js'
import { fid, fixtureAggregate } from './fixtures/index.js'
import { ULID_REGEX } from './ids.js'
import { DraftEvent, PodNormalizedOut } from './llm.js'

describe('fixture ids', () => {
  it('produces valid ULIDs', () => {
    expect(fid('EV', 0)).toMatch(ULID_REGEX)
    expect(fid('TM', 987654)).toMatch(ULID_REGEX)
  })

  it('is injective over kind and counter', () => {
    expect(fid('EV', 1)).not.toBe(fid('EV', 2))
    expect(fid('EV', 1)).not.toBe(fid('ER', 1))
  })

  it('rejects non-alphabet kind codes', () => {
    expect(() => fid('IL', 1)).toThrow()
  })
})

describe('TimelineAggregate', () => {
  it('parses the fixture world', () => {
    const parsed = TimelineAggregate.parse(fixtureAggregate())
    expect(parsed.events).toHaveLength(6)
    expect(parsed.branches).toHaveLength(2)
  })

  it('round-trips through JSON without loss', () => {
    const original = TimelineAggregate.parse(fixtureAggregate())
    const revived = TimelineAggregate.parse(JSON.parse(JSON.stringify(original)))
    expect(revived).toEqual(original)
  })

  it('rejects events with out-of-range plausibility', () => {
    const broken = fixtureAggregate()
    const event = broken.events[0]
    if (!event) throw new Error('fixture missing events')
    event.plausibility.score = 1.4
    expect(() => TimelineAggregate.parse(broken)).toThrow()
  })

  it('rejects empty state patches', () => {
    const broken = fixtureAggregate()
    const event = broken.events[0]
    if (!event?.deltas[0]) throw new Error('fixture missing deltas')
    event.deltas[0].patch = {}
    expect(() => TimelineAggregate.parse(broken)).toThrow()
  })

  it('rejects unknown lens values', () => {
    const broken = fixtureAggregate()
    const event = broken.events[0]
    if (!event) throw new Error('fixture missing events')
    // @ts-expect-error deliberately invalid
    event.lenses = ['military']
    expect(() => TimelineAggregate.parse(broken)).toThrow()
  })
})

describe('LLM draft schemas', () => {
  const draft = {
    ref: 'd1',
    year: 1461,
    dateLabel: 'Spring 1461',
    title: 'The grain fleet convention',
    summary: 'Venice and the Porte agree convoy schedules through the straits.',
    lenses: ['economic'],
    entitySlugs: ['byzantine-empire'],
    newEntities: [],
    deltas: [
      {
        entitySlug: 'byzantine-empire',
        patch: [{ key: 'grainSecurity', value: 'convoyed' }],
        note: 'The city eats on a schedule negotiated by others.',
      },
    ],
    causes: [{ ref: 'e2', kind: 'enables', strength: 0.6 }],
    plausibility: { score: 0.65, rationale: 'Convoy conventions were standard Venetian practice.' },
    wildcard: false,
  }

  it('accepts a well-formed draft event', () => {
    expect(DraftEvent.parse(draft).ref).toBe('d1')
  })

  it('rejects bad refs', () => {
    expect(() => DraftEvent.parse({ ...draft, ref: 'event-1' })).toThrow()
    expect(() =>
      DraftEvent.parse({ ...draft, causes: [{ ref: 'x9', kind: 'causes', strength: 0.5 }] }),
    ).toThrow()
  })

  it('parses pod normalization output', () => {
    const out = PodNormalizedOut.parse({
      statement: 'The Library of Alexandria never burns.',
      year: -48,
      dateLabel: '48 BC',
      region: 'Mediterranean',
      mechanism: 'knowledge',
      baselineContext: 'Caesar’s Alexandrian war fires spread to the dockside stacks.',
      suggestedTitle: 'The Unburnt Library',
    })
    expect(out.year).toBe(-48)
  })
})

describe('ArtifactBody', () => {
  it('discriminates on kind', () => {
    const poster = ArtifactBody.parse({
      kind: 'poster',
      headline: 'THE WALLS HELD',
      subheadline: null,
      lines: ['Give to the wall fund', 'Every hyperpyron rebuilds a tower'],
      issuer: 'Office of the Eparch',
      slogan: 'The City stands.',
    })
    expect(poster.kind).toBe('poster')
    expect(() =>
      ArtifactBody.parse({ kind: 'newspaper', headline: 'missing required fields' }),
    ).toThrow()
  })
})
