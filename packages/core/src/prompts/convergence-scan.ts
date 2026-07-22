import { type BaselineAnchor, ConvergenceScanOut } from '@uchronia/schemas'
import type { PromptTemplate } from './types.js'

export interface ConvergenceScanArgs {
  podStatement: string
  /** Committed era events, still labeled by their draft refs. */
  events: Array<{ ref: string; year: number; title: string; summary: string }>
  candidates: BaselineAnchor[]
}

/**
 * Stage 4 (§4.1): after each era, ask whether any accepted event *rhymes back
 * into the attested record* — the same structural outcome arriving by another
 * road. Matches become first-class ConvergencePoints (P3).
 */
export const convergenceScan: PromptTemplate<ConvergenceScanArgs, ConvergenceScanOut> = {
  id: 'convergence-scan',
  version: '1.0.0',
  changelog: ['1.0.0 — initial template'],
  role: 'critic',
  schemaName: 'ConvergenceScanOut',
  schema: ConvergenceScanOut,
  maxTokens: 2000,
  system: () =>
    `You detect convergence between a counterfactual timeline and the attested historical record. A convergence is NOT a similar-sounding title: it is the same structural outcome — the same pressure discharging into the same channel — reached by a different road. Be conservative: an era with no convergence is normal. Never force a match.`,
  prompt: ({ podStatement, events, candidates }) =>
    `Divergence: ${podStatement}

Counterfactual events from the era just generated:
${events.map((e) => `${e.ref} (${e.year}): ${e.title} — ${e.summary}`).join('\n')}

Attested anchors near this span (the record):
${candidates.map((c) => `${c.id} (${c.year}): ${c.title} — ${c.summary}`).join('\n')}

Report every genuine convergence as {ref, anchorId, similarityNote} — the note names the shared structure in one sentence ("the Danube frontier reasserts itself", "print finds its market either way"). Return an empty list if nothing truly converges.`,
  seedKey: ({ events, candidates }) =>
    `${events.map((e) => e.ref).join(',')}|${candidates.map((c) => c.id).join(',')}`,
}
