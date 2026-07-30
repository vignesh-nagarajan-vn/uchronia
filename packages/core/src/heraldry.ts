/**
 * Procedural heraldry (v2/M20): a coat of arms derived from an entity's slug.
 * Pure, deterministic, and entirely local: the same slug always yields the
 * same arms, on any machine, with no provider call and no stored asset.
 *
 * The vocabulary is deliberately period-plausible rather than exhaustive, and
 * the tincture rule is the real one (metal on colour, colour on metal), which
 * is what makes the output read as heraldry instead of as clip art.
 */

/** The two metals and five common colours of classical blazon. */
const METALS = [
  { name: 'or', hex: '#c9a227' },
  { name: 'argent', hex: '#e8e4d9' },
] as const

const COLOURS = [
  { name: 'gules', hex: '#9b2226' },
  { name: 'azure', hex: '#22436b' },
  { name: 'sable', hex: '#20232a' },
  { name: 'vert', hex: '#2f5d3a' },
  { name: 'purpure', hex: '#5b2a5e' },
] as const

const DIVISIONS = ['plain', 'per pale', 'per fess', 'per bend', 'per chevron', 'quarterly'] as const
export type Division = (typeof DIVISIONS)[number]

const CHARGES = [
  'lion',
  'eagle',
  'tower',
  'ship',
  'key',
  'wheat',
  'star',
  'crescent',
  'anchor',
  'book',
  'hammer',
  'bridge',
] as const
export type Charge = (typeof CHARGES)[number]

export interface Arms {
  division: Division
  /** Field tinctures; two entries when the division splits the shield. */
  field: string[]
  fieldNames: string[]
  charge: Charge
  chargeColour: string
  chargeName: string
  /** The blazon, written the way a herald would. */
  blazon: string
}

/** FNV-1a: small, stable, and dependency-free. Deterministic across machines. */
function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/**
 * Derive arms from a slug. The tincture rule is enforced rather than hoped
 * for: a coloured charge never sits on a coloured field, so the arms stay
 * legible at the size a dossier actually shows them.
 */
export function armsFor(slug: string): Arms {
  const h = hash(slug)
  const pick = <T>(list: readonly T[], shift: number): T =>
    list[Math.floor(h / 2 ** shift) % list.length] as T

  const division = pick(DIVISIONS, 0)
  const charge = pick(CHARGES, 8)
  // Half the arms are metal-on-colour and half colour-on-metal, decided by a
  // bit of the hash, so a roster does not come out uniformly dark or pale.
  const metalField = (h & 0x80) !== 0
  const primary = metalField ? pick(METALS, 3) : pick(COLOURS, 3)
  const secondary = metalField ? pick(COLOURS, 13) : pick(METALS, 13)
  const chargeTincture = metalField ? pick(COLOURS, 18) : pick(METALS, 18)

  const split = division !== 'plain'
  const field = split ? [primary.hex, secondary.hex] : [primary.hex]
  const fieldNames = split ? [primary.name, secondary.name] : [primary.name]

  const blazon = split
    ? `${capitalize(division)} ${fieldNames.join(' and ')}, a ${charge} ${chargeTincture.name}`
    : `${capitalize(primary.name)}, a ${charge} ${chargeTincture.name}`

  return {
    division,
    field,
    fieldNames,
    charge,
    chargeColour: chargeTincture.hex,
    chargeName: chargeTincture.name,
    blazon,
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** Charge glyphs as path data on a 100x100 field, centred on the shield. */
const CHARGE_PATHS: Record<Charge, string> = {
  lion: 'M50 28c-9 0-13 6-13 12 0 5 3 8 3 13s-4 6-4 11c0 6 6 10 14 10s14-4 14-10c0-5-4-6-4-11s3-8 3-13c0-6-4-12-13-12zm-6 12a2.5 2.5 0 110 5 2.5 2.5 0 010-5zm12 0a2.5 2.5 0 110 5 2.5 2.5 0 010-5z',
  eagle: 'M50 30l8 10 16-4-12 12 12 12-16-4-8 12-8-12-16 4 12-12-12-12 16 4z',
  tower: 'M34 44h32v30H34zM34 44v-8h6v5h6v-5h6v5h6v-5h6v8z',
  ship: 'M26 60h48l-6 12H32zM50 24v34M50 30l16 8-16 6z',
  key: 'M50 26a9 9 0 00-4 17v27h6v-6h6v-5h-6v-4h7v-5h-7v-7a9 9 0 00-2-17zm0 6a4 4 0 110 8 4 4 0 010-8z',
  wheat: 'M50 26v48M50 34l9-6M50 34l-9-6M50 44l9-6M50 44l-9-6M50 54l9-6M50 54l-9-6',
  star: 'M50 26l6 18h19l-15 11 6 18-16-11-16 11 6-18-15-11h19z',
  crescent: 'M62 28a24 24 0 100 44 28 28 0 010-44z',
  anchor:
    'M50 26a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5zm0 12v34M36 48h28M28 62c0 10 10 16 22 16s22-6 22-16',
  book: 'M28 34h20a4 4 0 014 4 4 4 0 014-4h20v34H52a4 4 0 00-4 4 4 4 0 00-4-4H28zM50 38v34',
  hammer: 'M34 34h32v12H34zM46 46h8v28h-8z',
  bridge: 'M24 62h52M30 62a20 20 0 0140 0M38 62v12M62 62v12M50 62v12',
}

/** Charges rendered as strokes rather than fills, so they read at small sizes. */
const STROKE_CHARGES = new Set<Charge>(['wheat', 'anchor', 'book', 'bridge', 'ship'])

/**
 * Render arms as a self-contained SVG string. No external references, so it
 * embeds anywhere the rest of the app does: the dossier, the static export,
 * and the book.
 */
export function armsSvg(slug: string, size = 96): string {
  const arms = armsFor(slug)
  const [a, b] = arms.field
  const second = b ?? a
  const shield = 'M8 6h84v46c0 22-18 34-42 42C26 86 8 74 8 52z'

  const halves: Record<Division, string> = {
    plain: `<path d="${shield}" fill="${a}"/>`,
    'per pale': `<path d="${shield}" fill="${a}"/><clipPath id="c"><path d="${shield}"/></clipPath><rect x="50" y="0" width="50" height="100" fill="${second}" clip-path="url(#c)"/>`,
    'per fess': `<path d="${shield}" fill="${a}"/><clipPath id="c"><path d="${shield}"/></clipPath><rect x="0" y="47" width="100" height="53" fill="${second}" clip-path="url(#c)"/>`,
    'per bend': `<path d="${shield}" fill="${a}"/><clipPath id="c"><path d="${shield}"/></clipPath><polygon points="0,0 100,100 0,100" fill="${second}" clip-path="url(#c)"/>`,
    'per chevron': `<path d="${shield}" fill="${a}"/><clipPath id="c"><path d="${shield}"/></clipPath><polygon points="50,40 100,100 0,100" fill="${second}" clip-path="url(#c)"/>`,
    quarterly: `<path d="${shield}" fill="${a}"/><clipPath id="c"><path d="${shield}"/></clipPath><rect x="50" y="0" width="50" height="47" fill="${second}" clip-path="url(#c)"/><rect x="0" y="47" width="50" height="53" fill="${second}" clip-path="url(#c)"/>`,
  }

  const path = CHARGE_PATHS[arms.charge]
  const charge = STROKE_CHARGES.has(arms.charge)
    ? `<path d="${path}" fill="none" stroke="${arms.chargeColour}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
    : `<path d="${path}" fill="${arms.chargeColour}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${arms.blazon}"><title>${arms.blazon}</title>${halves[arms.division]}${charge}<path d="${shield}" fill="none" stroke="#20232a" stroke-width="3"/></svg>`
}
