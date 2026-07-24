import { type Pressure, PressuresOut } from '@uchronia/schemas'
import type { DialParams } from '../dial.js'
import { SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface PressuresArgs {
  podStatement: string
  stateSummary: string
  recentEvents: string
  nextSpan: { startYear: number; endYear: number }
  distanceYears: number
  dial: DialParams
  /** Titles of nearby baseline anchors — the attractors, at high railroadness. */
  attractorHints: string[]
  /** What drove the era before this one; each must be carried, escalated, or discharged. */
  previousPressures: Pressure[]
}

/**
 * §4.3: read the current world-state and name the 3–7 active tensions that
 * will drive the next era. This is what makes era N+1 feel *caused by* era N
 * instead of merely following it. The dial's convergence-pressure term (§4.4c)
 * enters here — continuously: attractors are context at low dials, a magnet at
 * high ones, with the shift landing on the band edges rather than mid-band.
 */
export const derivePressures: PromptTemplate<PressuresArgs, PressuresOut> = {
  id: 'derive-pressures',
  version: '1.1.0',
  changelog: [
    '1.0.0 — initial template',
    '1.1.0 — attractor language scales with the dial instead of a mid-band cliff; previous pressures must be carried or discharged',
  ],
  role: 'critic',
  schemaName: 'PressuresOut',
  schema: PressuresOut,
  maxTokens: 2500,
  system: ({ dial }) =>
    `You read the state of a counterfactual world and name the tensions pressing on its next era — demographic, economic, technological, ideological, environmental. A pressure is not a prediction: it is a loaded spring, with a name, a mechanism, and an intensity.

${dial.attractorLanguage}

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({
    podStatement,
    stateSummary,
    recentEvents,
    nextSpan,
    distanceYears,
    dial,
    attractorHints,
    previousPressures,
  }) => {
    const p = dial.convergencePressure
    let attractorBlock = ''
    if (attractorHints.length > 0) {
      const hints = attractorHints.join(' · ')
      const stance =
        p > 2 / 3
          ? 'Where the world-state permits, at least one pressure should pull toward these familiar channels.'
          : p >= 1 / 3
            ? 'Where the world-state already leans toward one of these channels, a pressure may pull that way; do not force it.'
            : 'Treat these as context only — this history owes them nothing.'
      attractorBlock = `\nStructural attractors from the attested record near this span (convergence pressure ${p.toFixed(2)}): ${hints}. ${stance}\n`
    }
    const carryBlock =
      previousPressures.length > 0
        ? `\nThe pressures that drove the previous era — account for each one: carry it forward, escalate it, or show it discharged. Do not silently forget a loaded spring:\n${previousPressures
            .map((pr) => `- ${pr.name} (${pr.kind}, intensity ${pr.intensity})`)
            .join('\n')}\n`
        : ''
    return `Point of divergence (${distanceYears} years ago from the coming era): ${podStatement}

World-state snapshot:
${stateSummary}

Recent events:
${recentEvents}
${carryBlock}${attractorBlock}
Name the 3–7 pressures that will drive the years ${nextSpan.startYear}–${nextSpan.endYear}. Each: a short name, its kind, a 1–2 sentence description grounding it in the snapshot above (not in drama), and an intensity 0–1.`
  },
  seedKey: ({ nextSpan, dial, stateSummary }) =>
    `${nextSpan.startYear}-${nextSpan.endYear}|${dial.dial}|${stateSummary.length}`,
}
