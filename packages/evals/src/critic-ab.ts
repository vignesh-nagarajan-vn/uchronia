import { buildRequest, criticReview, dialParams, MockProvider } from '@uchronia/core'
import { CritiqueOut, type DraftEvent } from '@uchronia/schemas'
import { EVAL_MODELS, EvalLiveProvider, requireLiveContext } from './live-provider.js'

/**
 * The critic A/B (v2/M15): seeded-violation fixtures measure whether the
 * critic-tier model actually catches planted anachronisms, tone violations,
 * and causality breaks, and how often it false-flags clean drafts. Decision
 * rule (docs/EVALS.md): Haiku stays if it catches >= 80% of planted
 * violations with < 10% false flags; otherwise the critic tier is promoted
 * to the generation model. Live-gated: `--mock` only verifies the harness
 * plumbing (the mock critic's behavior is not the measurement).
 */

type Category = 'anachronism' | 'tone' | 'causality' | 'clean'

interface Fixture {
  id: string
  category: Category
  draft: DraftEvent
}

function draft(overrides: Partial<DraftEvent> & { ref: string }): DraftEvent {
  return {
    year: 1460,
    dateLabel: '1460',
    title: 'A quiet season on the straits',
    summary: 'Grain convoys run on schedule and the customs farm is rebid without incident.',
    lenses: ['economic'],
    entitySlugs: ['byzantine-empire'],
    newEntities: [],
    deltas: [
      {
        entitySlug: 'byzantine-empire',
        patch: [{ key: 'customsRegime', value: 'rebid' }],
        note: 'The ledger changes hands.',
      },
    ],
    causes: [{ ref: 'e1', kind: 'causes', strength: 0.6 }],
    plausibility: { score: 0.7, rationale: 'Administrative continuity.' },
    wildcard: false,
    ...overrides,
  }
}

export const FIXTURES: Fixture[] = [
  // Planted anachronisms.
  {
    id: 'anachro-radio',
    category: 'anachronism',
    draft: draft({
      ref: 'd1',
      title: 'The palace radio address',
      summary: 'The emperor calms the city with a radio broadcast carried to every district.',
    }),
  },
  {
    id: 'anachro-nationalism',
    category: 'anachronism',
    draft: draft({
      ref: 'd1',
      title: 'A referendum on the union',
      summary: 'Universal suffrage delivers a plebiscite on national self-determination.',
    }),
  },
  {
    id: 'anachro-germ-theory',
    category: 'anachronism',
    draft: draft({
      ref: 'd1',
      title: 'The quarantine of the microbes',
      summary: 'Physicians isolate the bacterium responsible and design a vaccination campaign.',
    }),
  },
  {
    id: 'anachro-printing-scale',
    category: 'anachronism',
    draft: draft({
      ref: 'd1',
      year: 1210,
      dateLabel: '1210',
      title: 'The daily newspapers of Constantinople',
      summary: 'Steam presses run day and night; every guild reads a morning paper.',
    }),
  },
  // Planted tone violations.
  {
    id: 'tone-em-dash-stock',
    category: 'tone',
    draft: draft({
      ref: 'd1',
      summary:
        'The harvest holds — a testament to the enduring spirit of the people — and stands as a pivotal moment in the tapestry of history.',
    }),
  },
  {
    id: 'tone-glorification',
    category: 'tone',
    draft: draft({
      ref: 'd1',
      title: 'The glorious cleansing of the coast',
      summary: 'The heroic massacre of the coastal villages is celebrated as a triumph of destiny.',
    }),
  },
  {
    id: 'tone-presentist-voice',
    category: 'tone',
    draft: draft({
      ref: 'd1',
      summary: 'Officials leverage synergies and optimize stakeholder alignment across the empire.',
    }),
  },
  {
    id: 'tone-drama',
    category: 'tone',
    draft: draft({
      ref: 'd1',
      title: 'And then everything changed forever',
      summary: 'Suddenly, in a single unforgettable night, the old world simply ended.',
    }),
  },
  // Planted causality breaks.
  {
    id: 'causal-unsupported-leap',
    category: 'causality',
    draft: draft({
      ref: 'd1',
      title: 'The empire annexes the western kingdoms',
      summary:
        'Because one customs clerk retired, the empire peacefully annexes all of western Europe within the year.',
      causes: [{ ref: 'e1', kind: 'causes', strength: 0.9 }],
      plausibility: { score: 0.9, rationale: 'It follows naturally.' },
    }),
  },
  {
    id: 'causal-effect-before-cause',
    category: 'causality',
    draft: draft({
      ref: 'd1',
      title: 'Mourning precedes the plague',
      summary:
        'The city holds funerals for plague victims a year before the plague arrives, in anticipation.',
    }),
  },
  {
    id: 'causal-contradiction',
    category: 'causality',
    draft: draft({
      ref: 'd1',
      title: 'The dead admiral commands again',
      summary: 'The admiral executed in the previous entry leads the spring convoy in person.',
    }),
  },
  {
    id: 'causal-no-mechanism',
    category: 'causality',
    draft: draft({
      ref: 'd1',
      title: 'The treasury doubles',
      summary:
        'The treasury doubles overnight with no new revenue, levy, seizure, or loan recorded.',
      causes: [],
    }),
  },
  // Clean controls.
  ...[1, 2, 3, 4, 5, 6].map((n) => ({
    id: `clean-${n}`,
    category: 'clean' as const,
    draft: draft({
      ref: 'd1',
      title: `The customs rebid of 146${n - 1}`,
      summary:
        'The customs farm is rebid after the old contract lapses; two Venetian houses lose sinecures and a Genoese house gains one. Tariff receipts shift modestly.',
    }),
  })),
]

const CATCH_TYPES: Record<Exclude<Category, 'clean'>, string[]> = {
  anachronism: ['anachronism', 'presentism'],
  tone: ['tone', 'cliche-collapse'],
  causality: ['implausible-leap', 'contradiction-with-state', 'teleology', 'on-divergence'],
}

async function run(provider: {
  complete: (r: ReturnType<typeof buildRequest>) => Promise<{ value: unknown; raw: string }>
}) {
  let caught = 0
  let planted = 0
  let falseFlags = 0
  let clean = 0
  for (const fixture of FIXTURES) {
    const request = buildRequest(criticReview, {
      podStatement: 'Constantinople holds in 1453.',
      podMechanism: 'politics',
      eraTitle: 'The Testing Years',
      eraSpan: '1455-1470',
      stateSummary:
        '- byzantine-empire (nation, "the Eastern Roman Empire"): treasury=strained; navy=rebuilt\n- admiral-notaras (person, "Loukas Notaras"): status=executed 1458',
      recentEvents:
        'e1 (1456): The walls are repaired | Masons close the cannon breaches over two seasons.',
      causeGlossary: 'e1 = The walls are repaired (1456): Masons close the cannon breaches.',
      dial: dialParams(50),
      drafts: [fixture.draft],
    })
    const result = await provider.complete(request)
    const parsed = CritiqueOut.safeParse(result.value ?? JSON.parse(result.raw))
    if (!parsed.success) {
      console.log(`${fixture.id}: UNPARSEABLE critic output`)
      continue
    }
    const verdict = parsed.data.verdicts[0]
    const flagged = verdict !== undefined && verdict.verdict !== 'pass'
    if (fixture.category === 'clean') {
      clean += 1
      if (flagged) {
        falseFlags += 1
        console.log(`${fixture.id}: FALSE FLAG (${verdict?.issues.map((i) => i.type).join(', ')})`)
      }
    } else {
      planted += 1
      // Any non-pass verdict counts as a catch (a violation caught under an
      // adjacent label still protects the ledger); the expected-type match is
      // reported for diagnosis only.
      if (flagged) {
        caught += 1
        const wanted = CATCH_TYPES[fixture.category]
        const onLabel = verdict?.issues.some((i) => wanted.includes(i.type)) ?? false
        if (!onLabel) {
          console.log(
            `${fixture.id}: caught off-label as ${verdict?.issues.map((i) => i.type).join(', ')}`,
          )
        }
      } else {
        console.log(`${fixture.id}: MISSED (${fixture.category})`)
      }
    }
  }
  const catchRate = planted ? caught / planted : 0
  const falseRate = clean ? falseFlags / clean : 0
  console.log(
    `\ncatch rate ${(catchRate * 100).toFixed(0)}% (${caught}/${planted}), false flags ${(falseRate * 100).toFixed(0)}% (${falseFlags}/${clean})`,
  )
  const keepHaiku = catchRate >= 0.8 && falseRate < 0.1
  console.log(
    keepHaiku
      ? 'verdict: the critic tier stays on Haiku (thresholds met)'
      : 'verdict: promote the critic tier to the generation model (thresholds missed)',
  )
  return keepHaiku
}

if (process.argv.includes('--mock')) {
  console.log('critic A/B plumbing check (mock provider; NOT a measurement)\n')
  await run(new MockProvider())
  process.exit(0)
} else {
  const { apiKey } = requireLiveContext()
  console.log(`critic A/B against ${EVAL_MODELS.critic}\n`)
  const keep = await run(new EvalLiveProvider(apiKey, EVAL_MODELS))
  process.exit(keep ? 0 : 1)
}
