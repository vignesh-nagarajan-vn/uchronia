import type { Mechanism } from '@uchronia/schemas'
import type { Rng } from '../rng.js'

/**
 * Name and phrase banks that give mock content period- and region-appropriate
 * texture. Era buckets are deliberately coarse: ancient (<500), medieval
 * (500–1500), early-modern (1500–1800), modern (>1800). Regions without a
 * curated bank fall back to era-neutral generics.
 */
export interface RegionFlavor {
  nation: string
  nationSlug: string
  rival: string
  rivalSlug: string
  persons: string[]
  institution: string
  institutionSlug: string
  city: string
  commodity: string
}

type Bucket = 'ancient' | 'medieval' | 'early-modern' | 'modern'

export function eraBucket(year: number): Bucket {
  if (year < 500) return 'ancient'
  if (year < 1500) return 'medieval'
  if (year < 1800) return 'early-modern'
  return 'modern'
}

const BANKS: Record<string, Partial<Record<Bucket, RegionFlavor>>> = {
  Mediterranean: {
    ancient: {
      nation: 'Ptolemaic Egypt',
      nationSlug: 'ptolemaic-egypt',
      rival: 'the Roman Republic',
      rivalSlug: 'roman-republic',
      persons: ['Sosigenes of Alexandria', 'Arsinoë Philopator', 'Theodotos of Chios'],
      institution: 'the Mouseion of Alexandria',
      institutionSlug: 'mouseion-of-alexandria',
      city: 'Alexandria',
      commodity: 'grain',
    },
    medieval: {
      nation: 'the Eastern Roman Empire',
      nationSlug: 'eastern-roman-empire',
      rival: 'the Ottoman court at Edirne',
      rivalSlug: 'ottoman-court',
      persons: ['Loukas Notaras', 'Anna Palaiologina', 'Georgios Sphrantzes'],
      institution: 'the Patriarchal chancery',
      institutionSlug: 'patriarchal-chancery',
      city: 'Constantinople',
      commodity: 'grain',
    },
    'early-modern': {
      nation: 'the Sublime Porte',
      nationSlug: 'sublime-porte',
      rival: 'the Republic of Venice',
      rivalSlug: 'republic-of-venice',
      persons: ['Kâtip Çelebi', 'Safiye Hatun', 'Domenico Trevisan'],
      institution: 'the arsenal of Kasımpaşa',
      institutionSlug: 'kasimpasa-arsenal',
      city: 'Istanbul',
      commodity: 'alum',
    },
  },
  Europe: {
    medieval: {
      nation: 'the Electorate of Mainz',
      nationSlug: 'electorate-of-mainz',
      rival: 'the Republic of Venice',
      rivalSlug: 'republic-of-venice',
      persons: ['Peter Schoeffer', 'Margarethe zum Jungen', 'Nicholas of Cusa'],
      institution: 'the scriptorium guild of the Rhine',
      institutionSlug: 'rhine-scriptorium-guild',
      city: 'Mainz',
      commodity: 'vellum',
    },
    'early-modern': {
      nation: 'the Kingdom of France',
      nationSlug: 'kingdom-of-france',
      rival: 'the Habsburg court',
      rivalSlug: 'habsburg-court',
      persons: ['Étienne Vaucanson', 'Marie-Anne Lefevre', 'Johann Beckmann'],
      institution: 'the Académie des sciences',
      institutionSlug: 'academie-des-sciences',
      city: 'Paris',
      commodity: 'salt',
    },
    modern: {
      nation: 'the German Confederation',
      nationSlug: 'german-confederation',
      rival: 'the Austrian chancellery',
      rivalSlug: 'austrian-chancellery',
      persons: ['Friedrich Hecker', 'Amalie Struve', 'Robert Blum'],
      institution: 'the Frankfurt assembly',
      institutionSlug: 'frankfurt-assembly',
      city: 'Frankfurt',
      commodity: 'coal',
    },
  },
  'East Asia': {
    medieval: {
      nation: 'the Ming court',
      nationSlug: 'ming-court',
      rival: 'the sultanate of Malacca',
      rivalSlug: 'malacca-sultanate',
      persons: ['Zheng He', 'Ma Huan', 'Wang Jinghong'],
      institution: 'the treasure-fleet yards of Longjiang',
      institutionSlug: 'longjiang-fleet-yards',
      city: 'Nanjing',
      commodity: 'porcelain',
    },
  },
  'North America': {
    modern: {
      nation: 'the United States',
      nationSlug: 'united-states',
      rival: 'the Soviet space directorate',
      rivalSlug: 'soviet-space-directorate',
      persons: ['Eleanor Vance', 'Marcus Okafor', 'Irene Castellanos'],
      institution: 'the national launch authority',
      institutionSlug: 'national-launch-authority',
      city: 'Houston',
      commodity: 'aluminum',
    },
  },
}

const GENERIC: Record<Bucket, RegionFlavor> = {
  ancient: {
    nation: 'the river kingdom',
    nationSlug: 'river-kingdom',
    rival: 'the highland league',
    rivalSlug: 'highland-league',
    persons: ['the archivist Senne', 'the envoy Kaidu', 'the astronomer Peleset'],
    institution: 'the temple granary college',
    institutionSlug: 'temple-granary-college',
    city: 'the delta capital',
    commodity: 'grain',
  },
  medieval: {
    nation: 'the coastal crown',
    nationSlug: 'coastal-crown',
    rival: 'the steppe confederacy',
    rivalSlug: 'steppe-confederacy',
    persons: ['Master Aldric', 'the chronicler Yeshe', 'Dame Osanne'],
    institution: 'the cathedral school',
    institutionSlug: 'cathedral-school',
    city: 'the harbor city',
    commodity: 'wool',
  },
  'early-modern': {
    nation: 'the maritime republic',
    nationSlug: 'maritime-republic',
    rival: 'the inland empire',
    rivalSlug: 'inland-empire',
    persons: ['Assessor Verhoeven', 'Doña Ines Almagro', 'the printer Csoma'],
    institution: 'the chartered exchange',
    institutionSlug: 'chartered-exchange',
    city: 'the exchange city',
    commodity: 'pepper',
  },
  modern: {
    nation: 'the federal republic',
    nationSlug: 'federal-republic',
    rival: 'the rival bloc',
    rivalSlug: 'rival-bloc',
    persons: ['Dr. Ilse Hartmann', 'Minister Adeyemi', 'the engineer Sofia Brandt'],
    institution: 'the standards bureau',
    institutionSlug: 'standards-bureau',
    city: 'the capital',
    commodity: 'steel',
  },
}

export function regionFlavor(region: string, year: number): RegionFlavor {
  const bucket = eraBucket(year)
  return BANKS[region]?.[bucket] ?? GENERIC[bucket]
}

/** The lens the mechanism most naturally speaks in. */
export const MECHANISM_LENS: Record<
  Mechanism,
  'political' | 'technological' | 'cultural' | 'economic'
> = {
  knowledge: 'cultural',
  disease: 'cultural',
  politics: 'political',
  technology: 'technological',
  economics: 'economic',
  environment: 'economic',
  culture: 'cultural',
}

export function pickPerson(flavor: RegionFlavor, rng: Rng): { name: string; slug: string } {
  const name = rng.pick(flavor.persons)
  const slug = name
    .toLowerCase()
    .replace(/^the\s+|^dr\.\s+|^dame\s+|^doña\s+|^master\s+|^minister\s+|^assessor\s+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return { name, slug }
}
