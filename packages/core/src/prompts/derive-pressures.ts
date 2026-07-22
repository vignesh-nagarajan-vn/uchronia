import { PressuresOut } from '@uchronia/schemas'
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
}

/**
 * §4.3: read the current world-state and name the 3–7 active tensions that
 * will drive the next era. This is what makes era N+1 feel *caused by* era N
 * instead of merely following it. The dial's convergence-pressure term (§4.4c)
 * enters here.
 */
export const derivePressures: PromptTemplate<PressuresArgs, PressuresOut> = {
  id: 'derive-pressures',
  version: '1.0.0',
  changelog: ['1.0.0 — initial template'],
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
  }) => {
    const attractorBlock =
      dial.convergencePressure > 0.55 && attractorHints.length > 0
        ? `\nStructural attractors from the attested record near this span (convergence pressure ${dial.convergencePressure.toFixed(2)}): ${attractorHints.join(' · ')}. Where the world-state permits, at least one pressure should pull toward these familiar channels.\n`
        : ''
    return `Point of divergence (${distanceYears} years ago from the coming era): ${podStatement}

World-state snapshot:
${stateSummary}

Recent events:
${recentEvents}
${attractorBlock}
Name the 3–7 pressures that will drive the years ${nextSpan.startYear}–${nextSpan.endYear}. Each: a short name, its kind, a 1–2 sentence description grounding it in the snapshot above (not in drama), and an intensity 0–1.`
  },
  seedKey: ({ nextSpan, dial, stateSummary }) =>
    `${nextSpan.startYear}-${nextSpan.endYear}|${dial.dial}|${stateSummary.length}`,
}
