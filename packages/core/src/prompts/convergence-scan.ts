import { type BaselineAnchor, ConvergenceScanOut } from '@uchronia/schemas'
import type { PromptTemplate } from './types.js'

export interface ConvergenceScanArgs {
  podStatement: string
  /** The POD's theatre - anchors were pre-ranked toward it. */
  region: string
  /** Committed era events, still labeled by their draft refs. */
  events: Array<{ ref: string; year: number; title: string; summary: string }>
  candidates: BaselineAnchor[]
}

/**
 * Stage 4 (§4.1): after each era, ask whether any accepted event *rhymes back
 * into the attested record* - the same structural outcome arriving by another
 * road. Matches become first-class ConvergencePoints (P3).
 */
export const convergenceScan: PromptTemplate<ConvergenceScanArgs, ConvergenceScanOut> = {
  id: 'convergence-scan',
  version: '1.4.0',
  changelog: [
    '1.0.0 - initial template',
    '1.1.0 - region-aware: candidates carry their theatre; matches must share it or explain why not',
    '1.2.0 - prompt strings stop modeling the em dash',
    '1.3.0 - candidates carry theme tags and attractor strength (v2/M16)',
    '1.4.0 - matches name the attractor that pulled and how the road differed (v2/M18)',
  ],
  role: 'critic',
  schemaName: 'ConvergenceScanOut',
  schema: ConvergenceScanOut,
  maxTokens: 2000,
  system: () =>
    `You detect convergence between a counterfactual timeline and the attested historical record. A convergence is NOT a similar-sounding title: it is the same structural outcome (the same pressure discharging into the same channel) reached by a different road. Be conservative: an era with no convergence is normal. Never force a match.`,
  prompt: ({ podStatement, region, events, candidates }) =>
    `Divergence: ${podStatement}
Theatre of the divergence: ${region}.

Counterfactual events from the era just generated:
${events.map((e) => `${e.ref} (${e.year}): ${e.title} | ${e.summary}`).join('\n')}

Attested anchors near this span (the record; each names its theatre, its themes, and how strongly structure pulls toward it, 0-1):
${candidates.map((c) => `${c.id} (${c.year}, ${c.region}; ${c.tags.join(', ')}; pull ${c.attractorStrength}): ${c.title} | ${c.summary}`).join('\n')}

High-pull anchors (0.7+) are structural channels a divergent history plausibly re-enters; low-pull anchors are contingent moments that rarely recur. Weigh matches accordingly.

A match across distant theatres needs the causal road between them spelled out in the note; when in doubt, no match.

Report every genuine convergence as {ref, anchorId, similarityNote, attractor, pathNote}.

- similarityNote names the shared structure in one sentence ("the Danube frontier reasserts itself", "print finds its market either way").
- attractor names WHICH structural force did the pulling, one of: demographic, geographic, technological, economic, cultural, institutional. Convergence without a named mechanism is coincidence, and coincidence is not a finding.
- pathNote says how the road differed, in one clause, when it did: "still emerges, but out of Korea rather than Mainz". Use null when this history simply arrived the usual way.

Return an empty list if nothing truly converges.`,
  seedKey: ({ events, candidates }) =>
    `${events.map((e) => e.ref).join(',')}|${candidates.map((c) => c.id).join(',')}`,
}
