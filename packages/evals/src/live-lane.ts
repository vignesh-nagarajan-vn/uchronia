import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  generateStructured,
  loadBaseline,
  podInterpret,
  retrieveAnchors,
  runGeneration,
  sketchPod,
  systemClock,
  ulidIdGen,
  World,
} from '@uchronia/core'
import type { Event, PodInterpretedOut, TimelineAggregate } from '@uchronia/schemas'
import { BENCHMARK, type BenchPod } from './bench.js'
import { type JudgeOut, relevanceJudge } from './judge.js'
import { EVAL_MODELS, EvalLiveProvider, requireLiveContext } from './live-provider.js'

/**
 * The live eval lane (v2/M15): LOCAL ONLY, budget-capped, spends real money.
 * For each benchmark POD (until the budget runs dry): live interpretation,
 * then seed + first era of a real derivation, then a generation-tier judge
 * scores relevance, era fit, anachronism, tone, and convergence sanity 1-5.
 * The release thresholds (docs/EVALS.md): relevance mean >= 4.0, no POD
 * below 3 - the WW2 gate. Reports carry scores only, never secrets.
 */

const DEFAULT_BUDGET = 500_000

interface LivePodResult {
  pod: BenchPod
  interpretation: PodInterpretedOut
  scores: JudgeOut
}

function aggregateFor(pod: BenchPod, interpretation: PodInterpretedOut): TimelineAggregate {
  const idgen = ulidIdGen()
  const now = systemClock.now().toISOString()
  const timelineId = idgen.next()
  const branchId = idgen.next()
  return {
    formatVersion: 1,
    timeline: {
      id: timelineId,
      title: interpretation.suggestedTitle,
      createdAt: now,
      settings: {
        dial: 50,
        horizonYears: 40,
        defaultLenses: ['political', 'technological', 'cultural', 'economic', 'daily-life'],
        models: {
          generation: EVAL_MODELS.generation,
          critic: EVAL_MODELS.critic,
          mode: 'live',
        },
      },
    },
    pod: {
      id: idgen.next(),
      timelineId,
      raw: pod.text,
      statement: interpretation.statement,
      year: interpretation.year,
      dateLabel: interpretation.dateLabel,
      region: interpretation.region,
      mechanism: interpretation.mechanism,
      baselineContext: interpretation.baselineContext,
      provenance: { kind: 'user' },
    },
    branches: [
      {
        id: branchId,
        timelineId,
        parentBranchId: null,
        forkEventId: null,
        subPod: null,
        name: 'main line',
        createdAt: now,
      },
    ],
    eras: [],
    events: [],
    entities: [],
    edges: [],
    artifacts: [],
    convergencePoints: [],
    critiqueReports: [],
    biographies: [],
  }
}

async function main() {
  const { apiKey } = requireLiveContext()
  const budget = Number(process.env.UCHRONIA_EVAL_BUDGET) || DEFAULT_BUDGET
  const provider = new EvalLiveProvider(apiKey, EVAL_MODELS)
  const anchors = loadBaseline().anchors
  const results: LivePodResult[] = []
  const skipped: string[] = []

  for (const pod of BENCHMARK) {
    if (pod.tags.includes('garbage')) continue // structural lane covers these
    if (provider.totalTokens() > budget) {
      skipped.push(pod.id)
      continue
    }
    process.stdout.write(`${pod.id} ... `)
    try {
      const sketch = sketchPod(pod.text, anchors)
      const retrieved = retrieveAnchors(anchors, pod.text, { year: sketch.year, limit: 12 }).map(
        (a) => ({ year: a.year, title: a.title, summary: a.summary, region: a.region }),
      )
      const interpreted = await generateStructured(provider, podInterpret, {
        raw: pod.text,
        anchors: retrieved,
      })
      const interpretation = interpreted.value

      // Seed + first era of a real derivation, then stop.
      const world = World.fromAggregate(aggregateFor(pod, interpretation))
      const branchId = world.allBranches()[0]?.id ?? ''
      const controller = new AbortController()
      const events: Event[] = []
      let erasDone = 0
      try {
        for await (const frame of runGeneration(
          { provider, idgen: ulidIdGen(), clock: systemClock, signal: controller.signal },
          world,
          branchId,
        )) {
          if (frame.type === 'event.accepted') events.push(frame.event)
          if (frame.type === 'era.completed') {
            erasDone += 1
            if (erasDone >= 2) controller.abort()
          }
        }
      } catch {
        // Aborting after the second era is the intended exit.
      }

      const judged = await generateStructured(provider, relevanceJudge, {
        podText: pod.text,
        interpretation: `${interpretation.statement} (${interpretation.dateLabel}, ${interpretation.region}, ${interpretation.mechanism})`,
        events: events.map((e) => ({ year: e.date.year, title: e.title, summary: e.summary })),
      })
      results.push({ pod, interpretation, scores: judged.value })
      console.log(`relevance ${judged.value.relevanceToPod}/5`)
    } catch (error) {
      console.log(`ERROR: ${error instanceof Error ? error.message : error}`)
    }
  }

  const relevance = results.map((r) => r.scores.relevanceToPod)
  const mean = relevance.length ? relevance.reduce((a, b) => a + b, 0) / relevance.length : 0
  const min = relevance.length ? Math.min(...relevance) : 0
  const passed = mean >= 4.0 && min >= 3

  const date = new Date().toISOString().slice(0, 10)
  const lines = [
    `# Live eval lane, ${date}`,
    '',
    `Judged ${results.length} PODs (${skipped.length} skipped at the ${budget.toLocaleString()}-token budget). Models: ${EVAL_MODELS.generation} (generation + judge), ${EVAL_MODELS.critic} (critic). Total spend this run: ${provider.totalTokens().toLocaleString()} tokens.`,
    '',
    '| POD | Relevance | Era fit | Anachronism | Tone | Convergence | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...results.map(
      (r) =>
        `| ${r.pod.id} | ${r.scores.relevanceToPod} | ${r.scores.eraFit} | ${r.scores.anachronism} | ${r.scores.tone} | ${r.scores.convergenceSanity} | ${r.scores.notes.replace(/\|/g, '/')} |`,
    ),
    '',
    `**Relevance mean ${mean.toFixed(2)}, min ${min}. WW2 gate (mean >= 4.0, min >= 3): ${passed ? 'PASS' : 'FAIL'}.**`,
    '',
  ]
  const target = join(
    dirname(fileURLToPath(import.meta.url)),
    `../../../docs/evals/live-lane-${date}.md`,
  )
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, lines.join('\n'), 'utf8')
  writeFileSync(
    target.replace(/\.md$/, '.json'),
    JSON.stringify(
      { date, results: results.map((r) => ({ id: r.pod.id, scores: r.scores })), mean, min },
      null,
      2,
    ),
    'utf8',
  )
  console.log(`\nrelevance mean ${mean.toFixed(2)}, min ${min} - ${passed ? 'PASS' : 'FAIL'}`)
  console.log(`report written to ${target}`)
  process.exit(passed ? 0 : 1)
}

await main()
