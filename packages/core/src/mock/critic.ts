import type { CritiqueIssue, CritiqueOut, DraftEvent, RegeneratedEventOut } from '@uchronia/schemas'
import type { CriticArgs } from '../prompts/critic-review.js'
import type { RegenerateArgs } from '../prompts/regenerate-event.js'
import type { Rng } from '../rng.js'

/**
 * Deterministic critic for mock mode. Rules mirror the live rubric closely
 * enough to exercise every pipeline path:
 *  - "suddenly" / "great war" in a summary → revise (cliche-collapse) - fixable
 *  - plausibility < 0.35 → dispute (implausible-leap) - kept and marked
 *  - otherwise pass, occasionally with a harmless note
 */
export function mockCriticReview(rawArgs: unknown, rng: Rng): CritiqueOut {
  const { drafts } = rawArgs as CriticArgs
  return {
    verdicts: drafts.map((draft) => {
      if (/\bsuddenly\b|\bgreat war\b/i.test(draft.summary)) {
        return {
          ref: draft.ref,
          verdict: 'revise' as const,
          issues: [
            {
              type: 'cliche-collapse' as const,
              severity: 'warning' as const,
              note: 'Collapse arrives "suddenly", without a structural cause named; history is allowed drama only on receipts.',
            },
          ],
        }
      }
      if (draft.plausibility.score < 0.35) {
        return {
          ref: draft.ref,
          verdict: 'dispute' as const,
          issues: [
            {
              type: 'implausible-leap' as const,
              severity: 'fail' as const,
              note: `The stated causes cannot carry this outcome (self-assessed plausibility ${draft.plausibility.score}); no regeneration will change the underlying claim.`,
            },
            {
              type: 'great-man-overreach' as const,
              severity: 'warning' as const,
              note: 'The draft leans on individual daring where the snapshot offers no structural door.',
            },
          ],
        }
      }
      const issues: CritiqueIssue[] =
        rng.next() < 0.25
          ? [
              {
                type: 'presentism' as const,
                severity: 'note' as const,
                note: 'Phrasing edges modern; acceptable, but watch the vocabulary.',
              },
            ]
          : []
      return { ref: draft.ref, verdict: 'pass' as const, issues }
    }),
  }
}

/**
 * Deterministic repair: fixes exactly the cliche marker the mock critic
 * flags (and nothing else - machine-level flaws like out-of-era years are
 * left in place so the drop path stays testable).
 */
export function mockRegenerateEvent(rawArgs: unknown, _rng: Rng): RegeneratedEventOut {
  const { draft } = rawArgs as RegenerateArgs
  const repairedSummary = draft.summary
    .replace(/\bsuddenly\b/gi, 'over the following season')
    .replace(/\bgreat war\b/gi, 'widening confrontation, itemized in levy rolls,')
  const repaired: DraftEvent = {
    ...draft,
    summary: repairedSummary.charAt(0).toUpperCase() + repairedSummary.slice(1),
    plausibility: {
      score: Math.min(1, draft.plausibility.score + 0.05),
      rationale: `${draft.plausibility.rationale} Revised after review: the mechanism is now named instead of asserted.`,
    },
  }
  return { event: repaired }
}
