import { describe, expect, it } from 'vitest'
import { loadBaseline } from './baseline.js'
import { parseYearFromText, sketchPod } from './pod-sketch.js'

const anchors = loadBaseline().anchors

describe('parseYearFromText (v2/M14: the year-2 bug dies)', () => {
  it('never reads a war number as a year', () => {
    expect(parseYearFromText('What if the Allies lost World War 2')).toBeNull()
    expect(parseYearFromText('what if germany won ww2?')).toBeNull()
  })

  it('reads real years, preferring 4 digits over 3', () => {
    expect(parseYearFromText('Constantinople holds in 1453')).toBe(1453)
    expect(parseYearFromText('300 ships sail in 1492')).toBe(1492)
    expect(parseYearFromText('Rome falls in 476')).toBe(476)
    expect(parseYearFromText('the 1930s depression deepens')).toBe(1930)
  })

  it('handles era markers on short years', () => {
    expect(parseYearFromText('Carthage wins in 202 BC')).toBe(-202)
    expect(parseYearFromText('the eruption of AD 79')).toBe(79)
    expect(parseYearFromText('the eruption of 79 AD')).toBe(79)
    expect(parseYearFromText('the library survives 48 BCE')).toBe(-48)
  })

  it('returns null when the text carries no year at all', () => {
    expect(parseYearFromText('the plague never comes')).toBeNull()
    expect(parseYearFromText('zzz qqq xyzzy')).toBeNull()
  })
})

describe('sketchPod - the WW2 gate, demo side', () => {
  it('lands "the Allies lost World War 2" in 1939-1945 Europe, politics', () => {
    const sketch = sketchPod('What if the Allies lost World War 2', anchors)
    expect(sketch.yearSource).toBe('alias')
    expect(sketch.year).toBeGreaterThanOrEqual(1939)
    expect(sketch.year).toBeLessThanOrEqual(1945)
    expect(sketch.region).toBe('Europe')
    expect(sketch.mechanism).toBe('politics')
    expect(sketch.aliasCandidates?.length).toBeGreaterThanOrEqual(2)
    expect(sketch.aliasCandidates?.map((c) => c.label)).toContain('Operation Sea Lion succeeds')
    for (const candidate of sketch.aliasCandidates ?? []) {
      expect(candidate.year).toBeGreaterThanOrEqual(1939)
      expect(candidate.year).toBeLessThanOrEqual(1945)
    }
  })

  it('recognizes the alias spellings', () => {
    for (const text of [
      'ww2 goes the other way',
      'WWII ends differently',
      'the second world war never ends',
      'what if the axis won world war two',
    ]) {
      const sketch = sketchPod(text, anchors)
      expect(sketch.year, text).toBe(1939)
      expect(sketch.yearSource, text).toBe('alias')
    }
  })

  it('keeps the great war apart from the second', () => {
    expect(sketchPod('the Great War drags on', anchors).year).toBe(1914)
    expect(sketchPod('world war one ends in 1915', anchors).year).toBe(1915)
    expect(sketchPod('wwi is averted', anchors).year).toBe(1914)
  })

  it('lets an explicit year beat the alias year', () => {
    const sketch = sketchPod('What if WW2 was still raging in 1948', anchors)
    expect(sketch.year).toBe(1948)
    expect(sketch.yearSource).toBe('explicit')
    expect(sketch.aliasCandidates).not.toBeNull()
  })

  it('knows the other named events', () => {
    expect(sketchPod('the cold war turns hot', anchors).year).toBe(1947)
    expect(sketchPod('the american civil war is averted', anchors).year).toBe(1861)
    expect(sketchPod('the french revolution fails', anchors).year).toBe(1789)
  })

  it('snaps unnamed asks to a real anchor on the subject instead of rolling dice', () => {
    const sketch = sketchPod('What if Constantinople held against the siege', anchors)
    expect(sketch.yearSource).toBe('anchor')
    // The ask names a city and a siege, so the snap must land on an attested
    // siege of that city. Which one is a reading, not a fact: the record holds
    // several, and the interpretation card is where the user picks.
    expect(sketch.matchedAnchor?.title).toMatch(/constantinople/i)
    expect(sketch.year).not.toBeNull()
    const anchorYears = anchors.filter((a) => /constantinople/i.test(a.title)).map((a) => a.year)
    expect(anchorYears).toContain(sketch.year)
  })

  it('discriminates between the sieges when the ask says which one', () => {
    // Denser baselines make this sharper, not vaguer: naming the besieger
    // must pick the besieger's siege.
    expect(sketchPod('What if Constantinople held against the Ottomans', anchors).year).toBe(1453)
    expect(sketchPod('What if Constantinople had not fallen to Mehmed', anchors).year).toBe(1453)
    expect(sketchPod('What if the Arab siege of Constantinople had taken it', anchors).year).toBe(
      718,
    )
  })

  it('leaves everything null for pure garbage - the caller picks the honest default', () => {
    const sketch = sketchPod('zzz qqq xyzzy plugh', anchors)
    expect(sketch.year).toBeNull()
    expect(sketch.yearSource).toBe('none')
    expect(sketch.aliasCandidates).toBeNull()
  })

  it('is deterministic', () => {
    const a = sketchPod('What if the Allies lost World War 2', anchors)
    const b = sketchPod('What if the Allies lost World War 2', anchors)
    expect(a).toEqual(b)
  })
})
