import { describe, expect, it } from 'vitest'
import { armsFor, armsSvg } from './heraldry.js'

/**
 * Heraldry is pure and deterministic by design (v2/M20): the same slug must
 * yield the same arms on every machine, forever, because the arms are how a
 * reader recognizes a house across a chronicle.
 */

const SLUGS = [
  'byzantine-empire',
  'the-ottomans',
  'constantine-xi',
  'the-pera-press',
  'the-improved-method',
  'the-plain-speech-circle',
  'a',
  'the-house-of-a-very-long-and-particular-name-indeed',
]

describe('procedural heraldry (v2/M20)', () => {
  it('is deterministic for a given slug', () => {
    for (const slug of SLUGS) {
      expect(armsFor(slug)).toEqual(armsFor(slug))
      expect(armsSvg(slug)).toBe(armsSvg(slug))
    }
  })

  it('gives different houses different arms', () => {
    const blazons = new Set(SLUGS.map((s) => armsFor(s).blazon))
    // Collisions are possible in principle; a whole roster colliding is a bug.
    expect(blazons.size).toBeGreaterThanOrEqual(SLUGS.length - 1)
  })

  it('obeys the tincture rule: never colour on colour, never metal on metal', () => {
    const METALS = new Set(['or', 'argent'])
    for (const slug of SLUGS) {
      const arms = armsFor(slug)
      const chargeIsMetal = METALS.has(arms.chargeName)
      // The charge sits on the primary field, so that pairing is the one that
      // has to be legible.
      const fieldIsMetal = METALS.has(arms.fieldNames[0] ?? '')
      expect(chargeIsMetal).not.toBe(fieldIsMetal)
    }
  })

  it('writes a blazon a herald would recognize', () => {
    const arms = armsFor('byzantine-empire')
    expect(arms.blazon).toMatch(/^[A-Z]/)
    expect(arms.blazon).toContain(arms.charge)
    expect(arms.blazon).toContain(arms.chargeName)
  })

  it('renders a self-contained SVG with no external references', () => {
    for (const slug of SLUGS) {
      const svg = armsSvg(slug)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
      expect(svg).toContain('viewBox="0 0 100 100"')
      // Nothing may reach off the page: no fonts, no images, no scripts. The
      // xmlns declaration is a namespace name, not a fetch, so it is excluded
      // before looking for anything that would actually go out to the network.
      const withoutNamespace = svg.replace(/xmlns="[^"]*"/g, '')
      expect(withoutNamespace).not.toMatch(/https?:|<image|<script|url\((?!#)/)
      // It carries its own description, so a screen reader gets the blazon.
      expect(svg).toContain(armsFor(slug).blazon)
    }
  })

  it('honours the requested size', () => {
    expect(armsSvg('byzantine-empire', 32)).toContain('width="32"')
    expect(armsSvg('byzantine-empire')).toContain('width="96"')
  })
})
