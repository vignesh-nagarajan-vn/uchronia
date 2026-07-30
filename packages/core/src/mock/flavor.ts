import type { Mechanism } from '@uchronia/schemas'
import type { Rng } from '../rng.js'

/**
 * Name and phrase banks that give mock content period- and region-appropriate
 * texture. Era buckets are deliberately coarse: ancient (<500), medieval
 * (500–1500), early-modern (1500–1800), modern (1800–1900), twentieth
 * (1900 on - added in v2/M14 so WW2-era and Cold-War demo content stops
 * wearing 1848's clothes). Regions without a curated bank fall back to
 * era-neutral generics.
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

type Bucket = 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'twentieth'

export function eraBucket(year: number): Bucket {
  if (year < 500) return 'ancient'
  if (year < 1500) return 'medieval'
  if (year < 1800) return 'early-modern'
  if (year < 1900) return 'modern'
  return 'twentieth'
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
    twentieth: {
      nation: 'the United Kingdom',
      nationSlug: 'united-kingdom',
      rival: 'the German Reich',
      rivalSlug: 'german-reich',
      persons: ['Group Captain Edith Marlowe', 'the broadcaster Hugh Carden', 'Dr. Lene Aldinger'],
      institution: 'the war cabinet secretariat',
      institutionSlug: 'war-cabinet-secretariat',
      city: 'London',
      commodity: 'petrol',
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
    twentieth: {
      nation: 'the Empire of Japan',
      nationSlug: 'empire-of-japan',
      rival: 'the American Pacific Fleet',
      rivalSlug: 'american-pacific-fleet',
      persons: [
        'Captain Harada Kiyoshi',
        'the diplomat Nomura Sadao',
        'the correspondent Ella Greenway',
      ],
      institution: 'the naval general staff',
      institutionSlug: 'naval-general-staff',
      city: 'Tokyo',
      commodity: 'oil',
    },
  },
  'North America': {
    twentieth: {
      nation: 'the United States',
      nationSlug: 'united-states',
      rival: 'the rival bloc',
      rivalSlug: 'rival-bloc',
      persons: ['Eleanor Vance', 'Marcus Okafor', 'Irene Castellanos'],
      institution: 'the federal research authority',
      institutionSlug: 'federal-research-authority',
      city: 'Washington',
      commodity: 'oil',
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
  twentieth: {
    nation: 'the continental republic',
    nationSlug: 'continental-republic',
    rival: 'the opposing bloc',
    rivalSlug: 'opposing-bloc',
    persons: ['Undersecretary Calloway', 'the correspondent Mira Volkonsky', 'Dr. Anselm Roth'],
    institution: 'the general staff college',
    institutionSlug: 'general-staff-college',
    city: 'the federal capital',
    commodity: 'oil',
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
