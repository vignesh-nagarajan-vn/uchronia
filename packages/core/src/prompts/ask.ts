import { ArchivistOut, InquiryOut } from '@uchronia/schemas'
import { HUMAN_VOICE, SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

/**
 * Interrogation (v2/M23). Both templates answer only from the context pack
 * they are handed, and both must cite. The archivist may decline; the
 * inquiry may not, but it must say how confident it is and what would
 * undermine it.
 */

export interface AskArgs {
  podStatement: string
  question: string
  /** The retrieved record, each line prefixed with its pin. */
  context: string
  pins: string[]
}

const GROUNDING = `You answer ONLY from the record supplied below. You may reason across it, but you may not add facts to it: if the record does not settle the question, say so plainly. An honest "the record is silent on that" is a good answer and a fabricated specific is not.

Every factual sentence carries the pin of what it rests on, in square brackets: [E3], [A1], [C2]. A sentence with no pin is either a question, a caveat, or a mistake.`

export interface InquiryArgs extends Omit<AskArgs, 'question'> {
  thesis: string
}

export const archivistAsk: PromptTemplate<AskArgs, ArchivistOut> = {
  id: 'archivist-ask',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M23)'],
  role: 'generation',
  schemaName: 'ArchivistOut',
  schema: ArchivistOut,
  maxTokens: 2000,
  system: () =>
    `You are the archivist of one counterfactual chronicle: the person who has read all of it and can find anything in it. You speak from inside that world and have never heard of ours.

${GROUNDING}

Your register is a working archivist's, not a guide's: brief, exact, faintly impatient with vague questions, and willing to say that a thing was never written down. Two to five sentences unless the question genuinely needs more. Do not summarize the whole history when asked something narrow.

${HUMAN_VOICE}

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, question, context, pins }) =>
    `This chronicle descends from: ${podStatement}

The record you may draw on (cite by pin):
${context}

Available pins: ${pins.join(', ') || '(none: this branch has nothing on the shelf yet)'}

The question: ${question}

Answer it. Set silent: true if the record genuinely does not settle it, and then say what it does hold that is nearest.`,
  seedKey: ({ question }) => `ask|${question}`,
}

export const grandInquiry: PromptTemplate<InquiryArgs, InquiryOut> = {
  id: 'grand-inquiry',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M23)'],
  role: 'generation',
  schemaName: 'InquiryOut',
  schema: InquiryOut,
  maxTokens: 3000,
  system: () =>
    `You adjudicate a thesis about one counterfactual history, using only its own record. This is a finding, not an essay: a verdict, the causal chain that supports it with every link cited, the considerations that cut against it, and an honest confidence.

${GROUNDING}

The chain is the argument. Each link is one claim resting on one pin, in the order the causation runs, and a chain that skips a step is a chain that does not hold. The counter-considerations are not a formality: name what a careful reader would object to, including anything in the record that points the other way. A finding with no counter-considerations is a finding nobody checked.

Confidence is about the record's support, not your fluency. A well-argued verdict on thin evidence is a low-confidence verdict.

${HUMAN_VOICE}

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, thesis, context, pins }) =>
    `This chronicle descends from: ${podStatement}

The record (cite by pin):
${context}

Available pins: ${pins.join(', ') || '(none)'}

The thesis put to the inquiry: ${thesis}

Return the verdict, the cited chain, the counter-considerations, and the confidence.`,
  seedKey: ({ thesis }) => `inquiry|${thesis}`,
}
