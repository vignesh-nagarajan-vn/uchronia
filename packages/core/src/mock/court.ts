import type { CourtBriefOut, CourtRulingOut } from '@uchronia/schemas'
import type { CourtBriefArgs, CourtJudgeArgs } from '../prompts/court.js'
import type { Rng } from '../rng.js'

/** Demo-mode Court of Plausibility (v2/M17): deterministic briefs and rulings. */

export function mockCourtAdvocate(rawArgs: unknown, _rng: Rng): CourtBriefOut {
  const { draft } = rawArgs as CourtBriefArgs
  return {
    brief: `The advocate submits that "${draft.title}" stands within the record given: its cited causes are live in the world-state, its scale is modest for the era, and the objection mistakes an unfamiliar outcome for an unearned one. Histories of this dial are permitted to surprise; they are not permitted to float, and this event does not float.`,
  }
}

export function mockCourtSkeptic(rawArgs: unknown, _rng: Rng): CourtBriefOut {
  const { draft } = rawArgs as CourtBriefArgs
  return {
    brief: `The skeptic answers that "${draft.title}" asks its causes to carry more than they weigh: the cited chain establishes opportunity, not outcome, and the world-state shows no actor with both the means and the appetite. Absent an intermediate step, the event is an assertion wearing a date.`,
  }
}

const REVISE_INSTRUCTION =
  'Name the intermediate step that carries the outcome; the leap as written is unearned.'

export function mockCourtJudge(rawArgs: unknown, rng: Rng): CourtRulingOut {
  const { draft } = rawArgs as CourtJudgeArgs
  // Deterministic per event (seedKey carries ref+title), varied across a run.
  const outcome = rng.pick(['revise', 'dispute', 'uphold'] as const)
  const opinions: Record<CourtRulingOut['outcome'], string> = {
    uphold: `The court finds for the advocate: the causes cited for "${draft.title}" are sufficient at this determinism, and the objection reduces to unfamiliarity. The event stands as written.`,
    revise: `The court finds the skeptic's narrower point proven: the outcome of "${draft.title}" is reachable but not yet reached on the page. One retelling is ordered, per the instruction.`,
    dispute: `The court cannot reconcile the briefs: the causes neither carry "${draft.title}" nor exclude it. The event is kept on the ledger under a visible dispute, with this record attached.`,
  }
  return {
    outcome,
    opinion: opinions[outcome],
    instruction: outcome === 'revise' ? REVISE_INSTRUCTION : null,
  }
}
