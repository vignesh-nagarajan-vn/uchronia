import type { TimelineAggregate } from '../aggregate.js'

/**
 * Deterministic fixture ids: valid ULIDs built from a two-letter kind code and
 * a counter. Only Crockford base32 characters are used (no I, L, O, U).
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function enc(n: number, width: number): string {
  let s = ''
  let v = n
  for (let i = 0; i < width; i++) {
    s = ALPHABET[v % 32] + s
    v = Math.floor(v / 32)
  }
  return s
}

/** e.g. fid('EV', 3) → "01EV0000000000000000000003" */
export function fid(kindCode: string, n: number): string {
  if (!/^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{2}$/.test(kindCode)) {
    throw new Error(`kind code must be two ULID-alphabet chars, got ${kindCode}`)
  }
  return `01${kindCode}${enc(n, 22)}`
}

export const FX = {
  timeline: fid('TM', 1),
  pod: fid('PD', 1),
  rootBranch: fid('BR', 1),
  childBranch: fid('BR', 2),
  era0: fid('ER', 1),
  era1: fid('ER', 2),
  childEra: fid('ER', 3),
  e0: fid('EV', 0),
  e1: fid('EV', 1),
  e2: fid('EV', 2),
  e3: fid('EV', 3),
  e4: fid('EV', 4),
  e5: fid('EV', 5),
  byzantium: fid('EN', 1),
  ottomans: fid('EN', 2),
  constantine: fid('EN', 3),
  peraPress: fid('EN', 4),
  edge01: fid('ED', 1),
  edge02: fid('ED', 2),
  edge23: fid('ED', 3),
  edge25: fid('ED', 4),
  artifact1: fid('AR', 1),
  convergence1: fid('CV', 1),
  critique1: fid('CR', 1),
  batch1: fid('CR', 90),
  bio1: fid('BG', 1),
} as const

const CREATED = '2026-07-22T12:00:00.000Z'

const generated = {
  kind: 'generated',
  model: 'mock',
  templateId: 'fixture',
  templateVersion: '1.0.0',
  generatedAt: CREATED,
  mode: 'mock',
} as const

/**
 * A small, complete world: "Constantinople holds, 1453." Two eras on the root
 * branch, a child branch forked mid-history, cross-branch causality, a
 * disputed event with critic notes, a convergence point, one artifact, one
 * biography. Returns a fresh deep copy on every call so tests may mutate.
 */
export function fixtureAggregate(): TimelineAggregate {
  const aggregate: TimelineAggregate = {
    formatVersion: 1,
    timeline: {
      id: FX.timeline,
      title: 'The City That Held',
      createdAt: CREATED,
      settings: {
        dial: 50,
        derivation: 'standard',
        court: false,
        horizonYears: 120,
        epilogue: false,
        defaultLenses: ['political', 'cultural'],
        models: { generation: 'mock', critic: 'mock', mode: 'mock' },
      },
    },
    pod: {
      id: FX.pod,
      timelineId: FX.timeline,
      raw: 'What if Constantinople never fell in 1453?',
      statement:
        'The Theodosian walls hold: the Ottoman assault of 29 May 1453 breaks, and Constantinople does not fall.',
      year: 1453,
      dateLabel: '29 May 1453',
      region: 'Mediterranean',
      mechanism: 'politics',
      baselineContext:
        'In real history Mehmed II took the city on 29 May 1453, ending the Eastern Roman Empire; Greek scholars scattered west with their libraries.',
      provenance: generated,
    },
    branches: [
      {
        id: FX.rootBranch,
        timelineId: FX.timeline,
        parentBranchId: null,
        forkEventId: null,
        subPod: null,
        name: 'main line',
        createdAt: CREATED,
      },
      {
        id: FX.childBranch,
        timelineId: FX.timeline,
        parentBranchId: FX.rootBranch,
        forkEventId: FX.e2,
        subPod: {
          raw: 'What if Constantine XI dies of plague in 1454?',
          statement: 'Constantine XI Palaiologos dies of plague in the winter of 1454.',
        },
        name: 'the Latin gambit',
        createdAt: CREATED,
      },
    ],
    eras: [
      {
        id: FX.era0,
        branchId: FX.rootBranch,
        ordinal: 0,
        startYear: 1453,
        endYear: 1455,
        title: 'The Siege That Failed',
        summary:
          'The assault breaks on the walls; the Ottoman court turns inward while the city counts the cost of survival.',
        pressures: [
          {
            name: 'Exhausted treasury',
            kind: 'economic',
            description: 'The city survived, but on borrowed Venetian money at ruinous interest.',
            intensity: 0.8,
          },
          {
            name: 'Ottoman succession anxiety',
            kind: 'ideological',
            description: 'A young sultan humiliated before janissaries who remember Varna.',
            intensity: 0.7,
          },
          {
            name: 'Depopulated countryside',
            kind: 'demographic',
            description: 'Thrace emptied by decades of raiding; the city cannot feed itself.',
            intensity: 0.6,
          },
        ],
        status: 'expanded',
        detail: null,
        speculative: false,
        provenance: generated,
      },
      {
        id: FX.era1,
        branchId: FX.rootBranch,
        ordinal: 1,
        startYear: 1455,
        endYear: 1470,
        title: 'An Empire on Credit',
        summary:
          'Byzantium survives as a Venetian client; Greek print shops open a decade before Mainz notices.',
        pressures: [
          {
            name: 'Venetian leverage',
            kind: 'economic',
            description: 'Loan covenants give the Serenissima quay rights and customs farms.',
            intensity: 0.9,
          },
          {
            name: 'Print spillover',
            kind: 'technological',
            description: 'Refugee German pressmen find Greek type patrons in Pera.',
            intensity: 0.5,
          },
          {
            name: 'Dynastic vacuum',
            kind: 'ideological',
            description: 'Constantine XI remains childless; three courts groom claimants.',
            intensity: 0.6,
          },
        ],
        status: 'skeleton',
        detail: null,
        speculative: false,
        provenance: generated,
      },
      {
        id: FX.childEra,
        branchId: FX.childBranch,
        ordinal: 0,
        startYear: 1454,
        endYear: 1460,
        title: 'The Latin Gambit',
        summary:
          'With the emperor dead of plague, the regency sells the union of the churches for a Western fleet.',
        pressures: [
          {
            name: 'Regency legitimacy',
            kind: 'ideological',
            description: 'No porphyrogenitus heir; the Morea despots contest the regency.',
            intensity: 0.8,
          },
          {
            name: 'Fleet dependence',
            kind: 'economic',
            description: 'The papal-Venetian squadron must be paid in privileges.',
            intensity: 0.7,
          },
          {
            name: 'Plague aftershock',
            kind: 'demographic',
            description: 'The 1454 outbreak halves the palace quarter.',
            intensity: 0.5,
          },
        ],
        status: 'skeleton',
        detail: null,
        speculative: false,
        provenance: generated,
      },
    ],
    events: [
      {
        id: FX.e0,
        branchId: FX.rootBranch,
        eraId: FX.era0,
        ordinal: 0,
        date: { year: 1453, label: '29 May 1453' },
        title: 'The final assault breaks on the Theodosian walls',
        summary:
          'The janissary wave stalls in the fosse under Giustiniani’s repaired stockade; by noon Mehmed sounds withdrawal, and the Golden Horn boom still holds.',
        detail:
          'Three waves went in before dawn. The bashi-bazouks died in the fosse as they always did; the Anatolians broke against the inner wall; and when the janissaries found the Kerkoporta barred - in this history, someone remembered to bar it - the assault lost its one cheap way in. Giustiniani took the splinter wound that in another chronicle kills the defense, but the Genoese surgeon’s tourniquet held him upright until dusk. What broke instead was the besiegers’ patience: the fleet had failed at the boom for seven weeks, the great bombard had cracked twice, and Halil Pasha’s peace party finally had its argument.',
        entityIds: [FX.byzantium, FX.ottomans, FX.constantine],
        deltas: [
          {
            entityId: FX.byzantium,
            patch: { morale: 'exultant', wallsIntact: true, population: 42000 },
            note: 'The city survives the assault; the walls are battered but standing.',
          },
          {
            entityId: FX.ottomans,
            patch: { courtFaction: 'peace party ascendant', sultanPrestige: 'wounded' },
            note: 'Halil Pasha’s faction gains the ear of a humiliated young sultan.',
          },
        ],
        lenses: ['political'],
        plausibility: {
          score: 0.74,
          rationale:
            'The siege was decided by narrow margins - the Kerkoporta, Giustiniani’s wound; a failed assault was widely expected by contemporaries.',
        },
        distanceFromPod: 0,
        wildcard: false,
        flags: { disputed: false, convergence: false, contested: false },
        criticNotes: null,
        provenance: generated,
      },
      {
        id: FX.e1,
        branchId: FX.rootBranch,
        eraId: FX.era0,
        ordinal: 1,
        date: { year: 1453, label: 'August 1453' },
        title: 'Mehmed lifts the siege and purges the war party',
        summary:
          'The army withdraws to Edirne; Zaganos Pasha is exiled and the young sultan submits to Halil’s tutelage, promising the janissaries Belgrade instead.',
        detail: null,
        entityIds: [FX.ottomans],
        deltas: [
          {
            entityId: FX.ottomans,
            patch: { grandVizier: 'Halil Pasha (confirmed)', strategy: 'Danube first' },
            note: 'Ottoman ambition pivots from the Bosporus to the Danube frontier.',
          },
        ],
        lenses: ['political'],
        plausibility: {
          score: 0.66,
          rationale:
            'A failed royal siege demanded a court scapegoat; Halil’s historical fall is here reversed onto his rivals.',
        },
        distanceFromPod: 0,
        wildcard: false,
        flags: { disputed: false, convergence: false, contested: false },
        criticNotes: null,
        provenance: generated,
      },
      {
        id: FX.e2,
        branchId: FX.rootBranch,
        eraId: FX.era0,
        ordinal: 2,
        date: { year: 1454, label: 'Spring 1454' },
        title: 'The Venetian loan and the quay concessions',
        summary:
          'Constantine XI signs a ruinous loan with Venice: 150,000 ducats against the customs of the Golden Horn, repayable in trade privileges the city can no longer refuse.',
        detail: null,
        entityIds: [FX.byzantium, FX.constantine],
        deltas: [
          {
            entityId: FX.byzantium,
            patch: { treasury: 'mortgaged to Venice', tradePolicy: 'Venetian preference' },
            note: 'Survival is financed by surrendering the customs house.',
          },
          {
            entityId: FX.constantine,
            patch: { reputation: 'the emperor who paid twice' },
            note: 'Court chroniclers begin the ledger of what survival cost.',
          },
        ],
        lenses: ['economic', 'political'],
        plausibility: {
          score: 0.71,
          rationale:
            'Byzantium had mortgaged crown jewels to Venice before; a surviving city had exactly one liquid creditor.',
        },
        distanceFromPod: 1,
        wildcard: false,
        flags: { disputed: false, convergence: false, contested: false },
        criticNotes: null,
        provenance: generated,
      },
      {
        id: FX.e3,
        branchId: FX.rootBranch,
        eraId: FX.era1,
        ordinal: 3,
        date: { year: 1457, label: '1457' },
        title: 'A Greek press opens in Pera',
        summary:
          'German pressmen fleeing the Mainz feud set movable Greek type for the Patriarchate; the first printed Psalter in Greek sells out its run of 300 by Epiphany.',
        detail: null,
        entityIds: [FX.byzantium, FX.peraPress],
        deltas: [
          {
            entityId: FX.peraPress,
            patch: { output: 'psalters, grammars', pressCount: 2 },
            note: 'The press finds a market in liturgy and schoolbooks.',
          },
          {
            entityId: FX.byzantium,
            patch: { literacyTrend: 'rising in the capital' },
            note: 'Cheap grammars seed parish schools around the Horn.',
          },
        ],
        lenses: ['technological', 'cultural'],
        plausibility: {
          score: 0.55,
          rationale:
            'Print reached Italy by 1465 in real history; a surviving Greek capital with church patronage plausibly pulls it east a few years early.',
        },
        distanceFromPod: 4,
        wildcard: true,
        flags: { disputed: false, convergence: false, contested: false },
        criticNotes: null,
        provenance: generated,
      },
      {
        id: FX.e4,
        branchId: FX.rootBranch,
        eraId: FX.era1,
        ordinal: 4,
        date: { year: 1462, label: 'Autumn 1462' },
        title: 'Ottoman guns take Belgrade',
        summary:
          'Redirected up the Danube, the bombards that failed at the Theodosian walls breach Belgrade; Hungary’s southern shield is gone a lifetime early.',
        detail: null,
        entityIds: [FX.ottomans],
        deltas: [
          {
            entityId: FX.ottomans,
            patch: { frontier: 'middle Danube', sultanPrestige: 'restored' },
            note: 'The dynasty converts Bosporus humiliation into Danubian conquest.',
          },
        ],
        lenses: ['political'],
        plausibility: {
          score: 0.48,
          rationale:
            'Belgrade resisted the real 1456 siege, but here faces the full siege train and no crusade of Capistrano.',
        },
        distanceFromPod: 9,
        wildcard: false,
        flags: { disputed: true, convergence: true, contested: false },
        criticNotes: [
          {
            type: 'great-man-overreach',
            severity: 'warning',
            note: 'Attributes the fall to the siege train alone; Hungarian court collapse needs its own cause.',
          },
          {
            type: 'implausible-leap',
            severity: 'fail',
            note: 'Belgrade’s river defenses defeated a larger fleet in 1456; the summary does not say why they fail here.',
          },
        ],
        provenance: generated,
      },
      {
        id: FX.e5,
        branchId: FX.childBranch,
        eraId: FX.childEra,
        ordinal: 0,
        date: { year: 1455, label: 'January 1455' },
        title: 'The regency signs the Union of the Two Churches',
        summary:
          'With Constantine dead of plague, the regency council trades full church union for a standing papal-Venetian fleet in the Horn.',
        detail: null,
        entityIds: [FX.byzantium],
        deltas: [
          {
            entityId: FX.byzantium,
            patch: { church: 'union enforced', fleetInHorn: true },
            note: 'The union the dead emperor could never enforce is signed by men with less to lose.',
          },
        ],
        lenses: ['political', 'cultural'],
        plausibility: {
          score: 0.6,
          rationale:
            'The union of Florence existed on paper since 1439; a regency desperate for ships had reason to enforce it.',
        },
        distanceFromPod: 2,
        wildcard: false,
        flags: { disputed: false, convergence: false, contested: false },
        criticNotes: null,
        provenance: generated,
      },
    ],
    entities: [
      {
        id: FX.byzantium,
        timelineId: FX.timeline,
        slug: 'byzantine-empire',
        type: 'nation',
        name: 'The Byzantine Empire',
        description: 'The thousand-year Roman remnant, now a city-state with an emperor.',
        initialState: {
          capital: 'Constantinople',
          population: 50000,
          treasury: 'empty',
          wallsIntact: true,
        },
        introducedByEventId: null,
        bornYear: null,
        counterfactual: false,
        succeedsSlug: null,
        createdAt: CREATED,
        provenance: generated,
      },
      {
        id: FX.ottomans,
        timelineId: FX.timeline,
        slug: 'ottoman-empire',
        type: 'nation',
        name: 'The Ottoman Empire',
        description: 'The rising power of two continents, checked at the Bosporus.',
        initialState: {
          ruler: 'Mehmed II',
          sultanPrestige: 'untested',
          strategy: 'take the City',
        },
        introducedByEventId: null,
        bornYear: null,
        counterfactual: false,
        succeedsSlug: null,
        createdAt: CREATED,
        provenance: generated,
      },
      {
        id: FX.constantine,
        timelineId: FX.timeline,
        slug: 'constantine-xi',
        type: 'person',
        name: 'Constantine XI Palaiologos',
        description: 'Last-crowned emperor of the Romans; in this history, not the last.',
        initialState: {
          office: 'Emperor of the Romans',
          heir: 'none',
          age: 48,
        },
        introducedByEventId: null,
        bornYear: null,
        counterfactual: false,
        succeedsSlug: null,
        createdAt: CREATED,
        provenance: generated,
      },
      {
        id: FX.peraPress,
        timelineId: FX.timeline,
        slug: 'pera-press',
        type: 'institution',
        name: 'The Pera Press',
        description: 'The first Greek-type printing house, across the Horn from the palace.',
        initialState: {
          founded: 1457,
          pressCount: 1,
          patron: 'Patriarchate of Constantinople',
        },
        introducedByEventId: FX.e3,
        bornYear: null,
        counterfactual: false,
        succeedsSlug: null,
        createdAt: CREATED,
        provenance: generated,
      },
    ],
    edges: [
      {
        id: FX.edge01,
        branchId: FX.rootBranch,
        fromEventId: FX.e0,
        toEventId: FX.e1,
        kind: 'causes',
        strength: 0.9,
      },
      {
        id: FX.edge02,
        branchId: FX.rootBranch,
        fromEventId: FX.e0,
        toEventId: FX.e2,
        kind: 'causes',
        strength: 0.7,
      },
      {
        id: FX.edge23,
        branchId: FX.rootBranch,
        fromEventId: FX.e1,
        toEventId: FX.e4,
        kind: 'enables',
        strength: 0.6,
      },
      {
        id: FX.edge25,
        branchId: FX.childBranch,
        fromEventId: FX.e2,
        toEventId: FX.e5,
        kind: 'enables',
        strength: 0.5,
      },
    ],
    artifacts: [
      {
        id: FX.artifact1,
        eventId: FX.e2,
        kind: 'letter',
        title: 'Letter of a Venetian factor on the quay concessions',
        body: {
          kind: 'letter',
          from: 'Niccolò Barbaro, factor',
          to: 'The honored house of Corner, Venice',
          place: 'Pera',
          dateLabel: '11 April 1454',
          salutation: 'Most honored masters,',
          paragraphs: [
            'The Greeks have signed. I watched the chrysobull sealed in gold before the Milion and I tell you the emperor’s hand did not shake, which is more than can be said of his chancellor’s.',
            'We hold the customs of the Horn for nineteen years, renewable at their default, which is to say: forever. Wheat, wax, and alum pass toll-free to our quay alone. The Genoese of Galata are beside themselves, and I confess their fury is worth half the profit to me.',
            'Send two more clerks who can write Greek, and a man who understands mills. This city will be bought back from the grave in installments, and we are holding the ledger.',
          ],
          closing: 'Your servant in all things,',
          signature: 'N. Barbaro',
          postscript:
            'P.S. The walls are still down in three places by the Pempton. Nobody repairs what a creditor may yet inherit.',
        },
        stylingHints: {
          tone: 'commercial, dry, privately gleeful',
          period: 'quattrocento merchant correspondence',
        },
        provenance: generated,
      },
    ],
    convergencePoints: [
      {
        id: FX.convergence1,
        branchId: FX.rootBranch,
        eventId: FX.e4,
        anchorId: 'bl-constantinople-1453',
        similarityNote:
          'Ottoman expansion resumes within a decade along the Danube - the structural drive toward Europe reasserts itself even with the City unconquered.',
        attractor: 'geographic',
        latenessYears: 12,
        pathNote:
          'The Danube road is taken anyway, a decade late and without the City as its base.',
        provenance: generated,
      },
    ],
    critiqueReports: [
      {
        id: FX.critique1,
        branchId: FX.rootBranch,
        batchId: FX.batch1,
        eraId: FX.era1,
        verdicts: [
          { eventId: FX.e3, issues: [], verdict: 'pass' },
          {
            eventId: FX.e4,
            issues: [
              {
                type: 'great-man-overreach',
                severity: 'warning',
                note: 'Attributes the fall to the siege train alone; Hungarian court collapse needs its own cause.',
              },
              {
                type: 'implausible-leap',
                severity: 'fail',
                note: 'Belgrade’s river defenses defeated a larger fleet in 1456; the summary does not say why they fail here.',
              },
            ],
            verdict: 'dispute',
          },
        ],
        createdAt: CREATED,
        provenance: generated,
      },
    ],
    biographies: [
      {
        id: FX.bio1,
        entityId: FX.constantine,
        branchId: FX.rootBranch,
        biography:
          'Constantine XI Palaiologos (1405–?) is remembered in this timeline not for how he died but for what he signed. The soldier-emperor who held the walls in May 1453 spent the rest of his reign holding a pen: the Venetian loan of 1454, the customs concessions, the grain contracts that fed a city too poor to feed itself. Chroniclers of the next century would call him ho diplous plerotes - "he who paid twice" - once in blood on the walls, once in gold on the quay. He never produced an heir, and the question of what he preserved the empire *for* outlived him.',
        provenance: generated,
      },
    ],
    courtRecords: [],
    claims: [],
    schools: [],
    interpretations: [],
  }
  return structuredClone(aggregate)
}
