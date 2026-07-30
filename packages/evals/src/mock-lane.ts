import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildRequest, MockProvider, podInterpret } from '@uchronia/core'
import { PodInterpretedOut } from '@uchronia/schemas'
import { BENCHMARK, type BenchPod } from './bench.js'

/**
 * The mock eval lane (v2/M15): deterministic structural assertions over the
 * demo engine's interpretation of every benchmark POD. Runs keyless in CI on
 * every push; a regression here means the demo engine would embarrass itself
 * in front of a user. `--report` also writes docs/evals/mock-lane.md.
 */

export interface PodResult {
  pod: BenchPod
  ok: boolean
  failures: string[]
  interpretation: PodInterpretedOut | null
}

export async function runMockLane(): Promise<{ results: PodResult[]; failed: number }> {
  const provider = new MockProvider()
  const results: PodResult[] = []
  for (const pod of BENCHMARK) {
    const failures: string[] = []
    let interpretation: PodInterpretedOut | null = null
    try {
      const raw = await provider.complete(
        buildRequest(podInterpret, { raw: pod.text, anchors: [] }),
      )
      interpretation = PodInterpretedOut.parse(raw.value)
    } catch (error) {
      failures.push(`threw or failed schema: ${error instanceof Error ? error.message : error}`)
    }
    if (interpretation) {
      const { expect } = pod
      if (interpretation.year < expect.yearMin || interpretation.year > expect.yearMax) {
        failures.push(`year ${interpretation.year} outside [${expect.yearMin}, ${expect.yearMax}]`)
      }
      if (
        expect.regionOneOf &&
        !expect.regionOneOf.some((r) => r.toLowerCase() === interpretation.region.toLowerCase())
      ) {
        failures.push(`region "${interpretation.region}" not in [${expect.regionOneOf.join(', ')}]`)
      }
      if (expect.mechanismOneOf && !expect.mechanismOneOf.includes(interpretation.mechanism)) {
        failures.push(
          `mechanism "${interpretation.mechanism}" not in [${expect.mechanismOneOf.join(', ')}]`,
        )
      }
      if (interpretation.candidates.length < (expect.minCandidates ?? 1)) {
        failures.push(
          `only ${interpretation.candidates.length} candidates (< ${expect.minCandidates ?? 1})`,
        )
      }
      if (expect.maxConfidence !== undefined && interpretation.confidence >= expect.maxConfidence) {
        failures.push(
          `confidence ${interpretation.confidence} not below ${expect.maxConfidence} (bluffing on a vague ask)`,
        )
      }
      if (expect.minConfidence !== undefined && interpretation.confidence < expect.minConfidence) {
        failures.push(`confidence ${interpretation.confidence} below ${expect.minConfidence}`)
      }
    }
    results.push({ pod, ok: failures.length === 0, failures, interpretation })
  }
  return { results, failed: results.filter((r) => !r.ok).length }
}

export function renderMockReport(results: PodResult[]): string {
  const lines = [
    '# Mock eval lane: demo intake benchmark',
    '',
    `Deterministic structural assertions over ${results.length} benchmark PODs (packages/evals/src/bench.ts), run keyless against the demo engine. Regenerate with \`pnpm --filter @uchronia/evals eval:report\`. Scores only; no prompts or responses.`,
    '',
    '| POD | Tags | Year | Region | Mechanism | Confidence | Result |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]
  for (const r of results) {
    const i = r.interpretation
    lines.push(
      `| ${r.pod.id} | ${r.pod.tags.join(', ')} | ${i?.year ?? '?'} | ${i?.region ?? '?'} | ${i?.mechanism ?? '?'} | ${i ? i.confidence.toFixed(2) : '?'} | ${r.ok ? 'pass' : `FAIL: ${r.failures.join('; ')}`} |`,
    )
  }
  lines.push('', `${results.filter((r) => r.ok).length}/${results.length} passing.`, '')
  return lines.join('\n')
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]
if (isMain) {
  const { results, failed } = await runMockLane()
  for (const r of results) {
    console.log(`${r.ok ? 'pass' : 'FAIL'}  ${r.pod.id}${r.ok ? '' : `  ${r.failures.join('; ')}`}`)
  }
  console.log(`\nmock lane: ${results.length - failed}/${results.length} passing`)
  if (process.argv.includes('--report')) {
    const target = join(dirname(fileURLToPath(import.meta.url)), '../../../docs/evals/mock-lane.md')
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, renderMockReport(results), 'utf8')
    console.log(`report written to ${target}`)
  }
  process.exit(failed > 0 ? 1 : 0)
}
