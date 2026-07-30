import { describe, expect, it } from 'vitest'
import { loadBaseline } from './baseline.js'
import { retrieveAnchors, tokenize } from './retrieval.js'

const anchors = loadBaseline().anchors

describe('retrieval (v2/M14)', () => {
  it('tokenizes content words and drops question scaffolding', () => {
    expect(tokenize('What if the Library of Alexandria never burned?')).toEqual([
      'library',
      'alexandria',
      'burned',
    ])
  })

  it('ranks the on-subject anchor first', () => {
    const hits = retrieveAnchors(anchors, 'Constantinople holds against the Ottoman siege', {
      limit: 5,
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.title.toLowerCase()).toContain('constantinople')
  })

  it('biases toward the implied year', () => {
    const hits = retrieveAnchors(anchors, 'the war in Europe', { year: 1943, limit: 8 })
    expect(hits.length).toBeGreaterThan(0)
    // Everything retrieved for a 1943 ask should at least be post-antiquity.
    const nearest = hits[0]
    expect(nearest && Math.abs(nearest.year - 1943) < 600).toBe(true)
  })

  it('returns nothing for garbage instead of guessing', () => {
    expect(retrieveAnchors(anchors, 'zzz qqq xyzzy plugh')).toEqual([])
  })

  it('is deterministic including tie-breaks', () => {
    const a = retrieveAnchors(anchors, 'printing press suppressed in Mainz', { limit: 6 })
    const b = retrieveAnchors(anchors, 'printing press suppressed in Mainz', { limit: 6 })
    expect(a.map((x) => x.id)).toEqual(b.map((x) => x.id))
  })
})
