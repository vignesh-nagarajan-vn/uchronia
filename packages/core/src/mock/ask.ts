import type { ArchivistOut, InquiryOut } from '@uchronia/schemas'
import type { AskArgs, InquiryArgs } from '../prompts/ask.js'
import type { Rng } from '../rng.js'

/**
 * Demo-mode interrogation (v2/M23). The answers are canned but the CITATIONS
 * are real: they are drawn from the pins actually retrieved, so a keyless
 * reader can click through to the same rows a live answer would point at.
 * An archivist who cites nothing would demonstrate the wrong thing.
 */

export function mockArchivistAsk(rawArgs: unknown, _rng: Rng): ArchivistOut {
  const args = rawArgs as AskArgs
  const pins = args.pins.filter((p) => p.startsWith('E')).slice(0, 3)
  if (pins.length === 0) {
    return {
      answer:
        'Nothing on this branch bears on that. The shelf is not empty, but what is on it does not answer the question you asked.',
      silent: true,
    }
  }
  return {
    answer: `Taking it in order: the ledger has ${pins[0]} on that directly [${pins[0]}], and what follows from it is recorded rather than inferred${pins[1] ? ` [${pins[1]}]` : ''}. ${pins[2] ? `The later entry [${pins[2]}] is the one most readers actually want, since it is where the arrangement stops being provisional. ` : ''}Beyond that the record thins, and I would rather say so than fill it in.`,
    silent: false,
  }
}

export function mockGrandInquiry(rawArgs: unknown, _rng: Rng): InquiryOut {
  const args = rawArgs as InquiryArgs
  const pins = args.pins.filter((p) => p.startsWith('E')).slice(0, 4)
  const chain =
    pins.length > 0
      ? pins.map((pin, i) => ({
          pin,
          claim:
            i === 0
              ? 'The divergence changes what the parties can afford, before it changes what they intend.'
              : i === 1
                ? 'That cost is passed along rather than absorbed, which is what makes it structural.'
                : i === 2
                  ? 'By the time the institutions respond, they are ratifying a fact rather than choosing one.'
                  : 'What the record calls a decision here is the arrangement becoming visible.',
        }))
      : [{ pin: 'E1', claim: 'The record does not carry enough to build a chain on.' }]
  return {
    verdict:
      pins.length >= 3
        ? 'Supported, but more weakly than the prose suggests: the chain holds at every link, and every link is thinner than the one before it.'
        : 'Not established. The record is consistent with the thesis and does not require it, which is not the same as supporting it.',
    confidence: pins.length >= 3 ? 0.55 : 0.25,
    chain,
    counterConsiderations: [
      'The chain reads well partly because the record was written in that order; a different ordering of the same events supports a weaker claim.',
      'Nothing here rules out the plain alternative, that the outcome was overdetermined and the divergence merely arrived first.',
      `The question as put ("${args.thesis.slice(0, 60)}") assumes the causation runs one way, and the record does not test the other direction.`,
    ],
  }
}
