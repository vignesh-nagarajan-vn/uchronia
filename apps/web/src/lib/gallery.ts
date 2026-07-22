import type { Dial, Lens } from '@uchronia/schemas'

/** F1 — the curated starter gallery: twelve divergences spanning eras, regions, mechanisms. */
export interface GalleryEntry {
  slug: string
  yearLabel: string
  region: string
  mechanism: string
  title: string
  line: string
  podText: string
  dial: Dial
  horizonYears: number
  lenses?: Lens[]
}

export const GALLERY: GalleryEntry[] = [
  {
    slug: 'alexandria',
    yearLabel: '48 BC',
    region: 'Mediterranean',
    mechanism: 'knowledge',
    title: 'The library never burns',
    line: 'Caesar’s fire spares the dockside stacks; the ancient world keeps its memory.',
    podText: 'The Library of Alexandria never burns in 48 BC',
    dial: 40,
    horizonYears: 200,
  },
  {
    slug: 'bronze-age',
    yearLabel: '1177 BC',
    region: 'Mediterranean',
    mechanism: 'politics',
    title: 'The Bronze Age holds',
    line: 'The palace economies weather the storm of the Sea Peoples; no dark centuries follow.',
    podText:
      'The Bronze Age Collapse is averted in 1177 BC and the palace economies of the eastern Mediterranean survive',
    dial: 35,
    horizonYears: 250,
  },
  {
    slug: 'zheng-he',
    yearLabel: '1433',
    region: 'East Asia',
    mechanism: 'politics',
    title: 'The treasure fleets sail on',
    line: 'The Ming keep their ocean; the age of discovery speaks Chinese first.',
    podText:
      "Zheng He's treasure fleets are never scrapped after 1433 and Ming China keeps its ocean-going navy",
    dial: 45,
    horizonYears: 200,
  },
  {
    slug: 'constantinople',
    yearLabel: '1453',
    region: 'Mediterranean',
    mechanism: 'politics',
    title: 'Constantinople holds',
    line: 'The Theodosian walls break the assault; the Eastern Roman Empire lives past May.',
    podText: 'Constantinople does not fall in 1453; the Theodosian walls hold against Mehmed II',
    dial: 55,
    horizonYears: 150,
  },
  {
    slug: 'gutenberg',
    yearLabel: '1455',
    region: 'Europe',
    mechanism: 'technology',
    title: 'The press is suppressed',
    line: 'Mainz’s creditors and clergy smother movable type for a century.',
    podText:
      'Gutenberg’s printing press is suppressed by church and guild for a century after 1455',
    dial: 50,
    horizonYears: 180,
  },
  {
    slug: 'al-andalus',
    yearLabel: '1492',
    region: 'Middle East',
    mechanism: 'culture',
    title: 'Al-Andalus endures',
    line: 'Granada negotiates survival; convivencia gets another act.',
    podText:
      'Al-Andalus endures past 1492; Granada negotiates a lasting settlement instead of surrendering',
    dial: 45,
    horizonYears: 200,
  },
  {
    slug: '1848',
    yearLabel: '1848',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The revolutions succeed',
    line: 'The spring of peoples survives its winter; the crowns concede for good.',
    podText: 'The 1848 revolutions succeed across Europe and the constitutions hold',
    dial: 40,
    horizonYears: 120,
  },
  {
    slug: 'penicillin',
    yearLabel: '1875',
    region: 'Europe',
    mechanism: 'disease',
    title: 'Penicillin, fifty years early',
    line: 'A curious assistant follows the mold; the germ century arrives armed.',
    podText: 'Penicillin is isolated and put to clinical use in 1875, fifty years early',
    dial: 50,
    horizonYears: 120,
  },
  {
    slug: 'haber',
    yearLabel: '1909',
    region: 'Europe',
    mechanism: 'technology',
    title: 'The Haber process fails',
    line: 'Nitrogen stays stubborn; fertilizer and explosives keep their old ceilings.',
    podText:
      'The Haber process fails in 1909 and synthetic nitrogen fixation proves impractical for decades',
    dial: 55,
    horizonYears: 120,
  },
  {
    slug: 'july-crisis',
    yearLabel: '1914',
    region: 'Europe',
    mechanism: 'politics',
    title: 'The July Crisis is defused',
    line: 'The machinery of alliance stalls at the brink; the long peace limps on.',
    podText: 'The July Crisis of 1914 is defused and the great powers step back from general war',
    dial: 60,
    horizonYears: 110,
  },
  {
    slug: 'apollo',
    yearLabel: '1972',
    region: 'North America',
    mechanism: 'technology',
    title: 'Apollo doesn’t stop',
    line: 'The program survives the budget knife; the Moon becomes a place of work.',
    podText:
      'The Apollo program does not stop at 17; lunar missions continue through the 1970s and beyond',
    dial: 45,
    horizonYears: 80,
  },
  {
    slug: 'carrington',
    yearLabel: '1989',
    region: 'the wider world',
    mechanism: 'environment',
    title: 'A Carrington-class storm, 1989',
    line: 'The sky catches fire over an electrified planet; the grids do not come back quickly.',
    podText:
      'A Carrington-class geomagnetic storm hits Earth in 1989, collapsing power grids across the northern hemisphere',
    dial: 50,
    horizonYears: 60,
  },
]
