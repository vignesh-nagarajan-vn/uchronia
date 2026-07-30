import type {
  CourtRecord,
  CritiqueIssue,
  CritiqueReport,
  DraftEvent,
  Era,
  EventVerdict,
  GeneratedProvenance,
} from '@uchronia/schemas'
import type { DialParams } from '../dial.js'
import { courtAdvocate, courtJudge, courtSkeptic } from '../prompts/court.js'
import { criticReview } from '../prompts/critic-review.js'
import { regenerateEvent } from '../prompts/regenerate-event.js'
import type { World } from '../world.js'
import { summarizeRecentEvents, summarizeState } from './context.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import {
  type DraftContext,
  dropBackwardsEdges,
  type ResolvedBatch,
  resolveDrafts,
} from './drafts.js'
import { generateStructured } from './structured.js'
import { validateBatchOnClone } from './validate.js'

const MAX_REVISIONS = 2
/** Cap on concurrent regenerate-event calls per revision pass (live-mode courtesy). */
const REVISION_CONCURRENCY = 3
/** The court hears at most this many cases per era (cost discipline, v2/M17). */
const MAX_COURT_CASES = 3

export interface RefinedBatch {
  batch: ResolvedBatch
  /** Final per-event verdicts for the committed events. */
  verdicts: EventVerdict[]
  /** Draft refs dropped because machine rules still failed after retries. */
  droppedRefs: string[]
  /** Court of Plausibility transcripts (v2/M17), when the court sat. */
  courtRecords: CourtRecord[]
  warnings: string[]
}

interface Assessment {
  /** ref → machine-rule failures (hard: cannot commit). */
  machine: Map<string, string[]>
  /** ref → critic issues. */
  criticIssues: Map<string, CritiqueIssue[]>
  /** ref → critic verdict. */
  criticVerdict: Map<string, 'pass' | 'revise' | 'dispute'>
  batch: ResolvedBatch
}

/**
 * The dual review (§P4): machine validator + skeptical critic over one batch
 * of drafts, with bounded regeneration. Machine failures that survive retries
 * are dropped (graph rules cannot be argued with); critic objections that
 * survive retries commit visibly marked disputed with the notes attached.
 */
export async function refineBatch(args: {
  ctx: PipelineCtx
  world: World
  branchId: string
  era: Era
  drafts: DraftEvent[]
  dial: DialParams
  provenance: GeneratedProvenance
}): Promise<RefinedBatch> {
  const { ctx, world, branchId, era, dial, provenance } = args
  const warnings: string[] = []

  // Dial rule (d): wildcards below the plausibility floor never reach review.
  let drafts = args.drafts.filter((draft) => {
    if (draft.wildcard && draft.plausibility.score < dial.wildcardPlausibilityFloor) {
      warnings.push(
        `wildcard "${draft.title}" discarded below the plausibility floor (${draft.plausibility.score} < ${dial.wildcardPlausibilityFloor.toFixed(2)})`,
      )
      return false
    }
    return true
  })

  const draftCtx = (): DraftContext => ({
    world,
    branchId,
    eraId: era.id,
    idgen: ctx.idgen,
    clock: ctx.clock,
    provenance,
  })

  const criticContext = {
    podStatement: world.pod.statement,
    podMechanism: world.pod.mechanism,
    eraTitle: era.title,
    eraSpan: `${era.startYear}–${era.endYear}`,
    stateSummary: summarizeState(world, branchId),
    recentEvents: summarizeRecentEvents(world, branchId),
  }

  const assess = async (
    candidate: DraftEvent[],
    criticTargets: Set<string> | null,
  ): Promise<Assessment> => {
    const batch = dropBackwardsEdges(resolveDrafts(draftCtx(), candidate))
    warnings.push(...batch.warnings.splice(0))

    const machine = new Map<string, string[]>()
    const eventIdToRef = new Map([...batch.refToEventId].map(([ref, id]) => [id, ref]))
    for (const issue of validateBatchOnClone(world, branchId, era, batch)) {
      const ref = issue.eventId ? eventIdToRef.get(issue.eventId) : undefined
      const key = ref ?? '(batch)'
      machine.set(key, [...(machine.get(key) ?? []), `${issue.rule}: ${issue.message}`])
    }

    const criticIssues = new Map<string, CritiqueIssue[]>()
    const criticVerdict = new Map<string, 'pass' | 'revise' | 'dispute'>()
    const toReview = criticTargets ? candidate.filter((d) => criticTargets.has(d.ref)) : candidate
    if (toReview.length > 0) {
      const review = await generateStructured(
        ctx.provider,
        criticReview,
        {
          ...criticContext,
          dial,
          causeGlossary: buildCauseGlossary(world, branchId, candidate),
          drafts: toReview,
        },
        callOpts(ctx),
      )
      for (const verdict of review.value.verdicts) {
        criticIssues.set(verdict.ref, verdict.issues)
        criticVerdict.set(verdict.ref, verdict.verdict)
      }
    }
    return { machine, criticIssues, criticVerdict, batch }
  }

  // First full assessment.
  let assessment = await assess(drafts, null)
  const finalVerdict = new Map(assessment.criticVerdict)
  const finalIssues = new Map(assessment.criticIssues)

  for (let attempt = 0; attempt < MAX_REVISIONS; attempt++) {
    const needsRevision = drafts.filter((draft) => {
      const machineBad = (assessment.machine.get(draft.ref) ?? []).length > 0
      const criticSaysRevise = finalVerdict.get(draft.ref) === 'revise'
      return machineBad || criticSaysRevise
    })
    if (needsRevision.length === 0) break

    const revisedRefs = new Set<string>()
    // Bounded fan-out: up to REVISION_CONCURRENCY provider calls in flight,
    // not one per flagged draft - a rate-limit and latency courtesy that the
    // deterministic mock never notices.
    const revised: (typeof drafts)[number][] = []
    for (let i = 0; i < needsRevision.length; i += REVISION_CONCURRENCY) {
      const chunk = needsRevision.slice(i, i + REVISION_CONCURRENCY)
      revised.push(
        ...(await Promise.all(
          chunk.map(async (draft) => {
            const issues = [
              ...(assessment.machine.get(draft.ref) ?? []),
              ...(finalIssues.get(draft.ref) ?? []).map(
                (i) => `${i.type} (${i.severity}): ${i.note}`,
              ),
            ]
            const replacement = await generateStructured(
              ctx.provider,
              regenerateEvent,
              {
                podStatement: criticContext.podStatement,
                eraTitle: criticContext.eraTitle,
                eraSpan: criticContext.eraSpan,
                stateSummary: criticContext.stateSummary,
                draft,
                issues,
                voice: dial.voiceLanguage,
              },
              callOpts(ctx),
            )
            revisedRefs.add(draft.ref)
            return replacement.value.event
          }),
        )),
      )
    }
    const byRef = new Map(revised.map((d) => [d.ref, d]))
    drafts = drafts.map((d) => byRef.get(d.ref) ?? d)

    assessment = await assess(drafts, revisedRefs)
    for (const ref of revisedRefs) {
      finalVerdict.set(ref, assessment.criticVerdict.get(ref) ?? 'pass')
      finalIssues.set(ref, assessment.criticIssues.get(ref) ?? [])
    }
  }

  // Sentence pass: drop what the machine still rejects; mark what the critic
  // still objects to; commit the rest clean.
  const droppedRefs: string[] = []
  const disputedRefs = new Set<string>()
  for (const draft of drafts) {
    if ((assessment.machine.get(draft.ref) ?? []).length > 0) {
      droppedRefs.push(draft.ref)
      warnings.push(
        `"${draft.title}" dropped - machine rules still failing after ${MAX_REVISIONS} revisions: ${(assessment.machine.get(draft.ref) ?? []).join('; ')}`,
      )
      continue
    }
    const verdict = finalVerdict.get(draft.ref)
    if (verdict === 'dispute' || verdict === 'revise') {
      disputedRefs.add(draft.ref)
    }
  }
  const batchIssues = assessment.machine.get('(batch)') ?? []
  if (batchIssues.length > 0) {
    warnings.push(`batch-level validation issues: ${batchIssues.join('; ')}`)
  }

  // ---- The Court of Plausibility (v2/M17, opt-in) --------------------------
  // One bounded adversarial exchange per critic-disputed draft: advocate and
  // skeptic brief on the critic tier, a judge rules on the generation tier.
  // uphold clears the mark; revise orders one retelling (machine-validated,
  // falling back to the dispute if the retelling breaks graph rules);
  // dispute keeps the mark with the transcript attached. No loops.
  const courtOutcomes = new Map<
    string,
    { advocate: string; skeptic: string; ruling: CourtRecord['ruling']; model: string }
  >()
  if (world.timeline.settings.court && disputedRefs.size > 0) {
    for (const ref of [...disputedRefs].slice(0, MAX_COURT_CASES)) {
      const draft = drafts.find((d) => d.ref === ref)
      if (!draft) continue
      const criticIssues = (finalIssues.get(ref) ?? []).map(
        (i) => `${i.type} (${i.severity}): ${i.note}`,
      )
      const briefArgs = {
        podStatement: criticContext.podStatement,
        eraSpan: criticContext.eraSpan,
        stateSummary: criticContext.stateSummary,
        causeGlossary: buildCauseGlossary(world, branchId, drafts),
        draft,
        criticIssues,
      }
      const [advocate, skeptic] = await Promise.all([
        generateStructured(ctx.provider, courtAdvocate, briefArgs, callOpts(ctx)),
        generateStructured(ctx.provider, courtSkeptic, briefArgs, callOpts(ctx)),
      ])
      const judged = await generateStructured(
        ctx.provider,
        courtJudge,
        { ...briefArgs, advocateBrief: advocate.value.brief, skepticBrief: skeptic.value.brief },
        callOpts(ctx),
      )
      const ruling = judged.value
      courtOutcomes.set(ref, {
        advocate: advocate.value.brief,
        skeptic: skeptic.value.brief,
        ruling,
        model: judged.model,
      })
      if (ruling.outcome === 'uphold') {
        disputedRefs.delete(ref)
      } else if (ruling.outcome === 'revise') {
        const replacement = await generateStructured(
          ctx.provider,
          regenerateEvent,
          {
            podStatement: criticContext.podStatement,
            eraTitle: criticContext.eraTitle,
            eraSpan: criticContext.eraSpan,
            stateSummary: criticContext.stateSummary,
            draft,
            issues: [ruling.instruction ?? ruling.opinion],
            voice: dial.voiceLanguage,
          },
          callOpts(ctx),
        )
        const retold = replacement.value.event
        const trial = drafts.map((d) => (d.ref === ref ? retold : d))
        const trialBatch = dropBackwardsEdges(
          resolveDrafts(
            draftCtx(),
            trial.filter((d) => !droppedRefs.includes(d.ref)),
          ),
        )
        const trialEventId = trialBatch.refToEventId.get(ref)
        const trialIssues = validateBatchOnClone(world, branchId, era, trialBatch).filter(
          (issue) => issue.eventId === trialEventId,
        )
        if (trialIssues.length === 0) {
          drafts = trial
          disputedRefs.delete(ref)
          warnings.push(`the court ordered a retelling of "${draft.title}"; the retelling stands`)
        } else {
          warnings.push(
            `the court ordered a retelling of "${draft.title}" but the retelling broke graph rules; the original stands, disputed`,
          )
        }
      }
    }
  }

  const kept = drafts.filter((d) => !droppedRefs.includes(d.ref))
  let batch = dropBackwardsEdges(resolveDrafts(draftCtx(), kept))
  warnings.push(...batch.warnings.splice(0))

  // Attach disputes to the final resolved events.
  batch = {
    ...batch,
    events: batch.events.map((event) => {
      const ref = [...batch.refToEventId].find(([, id]) => id === event.id)?.[0]
      if (ref && disputedRefs.has(ref)) {
        return {
          ...event,
          flags: { ...event.flags, disputed: true },
          criticNotes: finalIssues.get(ref) ?? [],
        }
      }
      return event
    }),
  }

  const verdicts: EventVerdict[] = []
  for (const [ref, eventId] of batch.refToEventId) {
    verdicts.push({
      eventId,
      issues: finalIssues.get(ref) ?? [],
      verdict: disputedRefs.has(ref) ? 'dispute' : 'pass',
    })
  }

  // Transcripts bind to the committed event ids; a case whose draft was
  // ultimately dropped leaves no record (there is nothing to attach it to).
  const courtRecords: CourtRecord[] = []
  for (const [ref, outcome] of courtOutcomes) {
    const eventId = batch.refToEventId.get(ref)
    if (!eventId) continue
    courtRecords.push({
      id: ctx.idgen.next(),
      branchId,
      eventId,
      advocate: outcome.advocate,
      skeptic: outcome.skeptic,
      ruling: outcome.ruling,
      createdAt: ctx.clock.now().toISOString(),
      provenance: makeProvenance(ctx, courtJudge, outcome.model),
    })
  }

  return { batch, verdicts, droppedRefs, courtRecords, warnings }
}

/**
 * Resolve every cause ref the drafts cite to a title the critic can weigh -
 * without this the "stated causes cannot carry the weight" criterion is
 * unjudgeable, since e<n>/d<n> handles carry no meaning on their own.
 */
export function buildCauseGlossary(world: World, branchId: string, drafts: DraftEvent[]): string {
  const visible = world.resolveEvents(branchId)
  const byRef = new Map(drafts.map((d) => [d.ref, d]))
  const lines: string[] = []
  const seen = new Set<string>()
  for (const draft of drafts) {
    for (const cause of draft.causes) {
      if (seen.has(cause.ref)) continue
      seen.add(cause.ref)
      if (cause.ref.startsWith('e')) {
        const event = visible[Number(cause.ref.slice(1)) - 1]
        lines.push(
          event
            ? `${cause.ref} = ${event.title} (${event.date.label}): ${event.summary}`
            : `${cause.ref} = (resolves to no event - treat as an unsupported cause)`,
        )
      } else {
        const other = byRef.get(cause.ref)
        lines.push(
          other
            ? `${cause.ref} = ${other.title} (draft in this batch)`
            : `${cause.ref} = (no such draft - treat as an unsupported cause)`,
        )
      }
    }
  }
  return lines.length > 0 ? lines.join('\n') : '(no causes cited by any draft)'
}

export function buildCritiqueReport(
  ctx: PipelineCtx,
  branchId: string,
  eraId: string | null,
  verdicts: EventVerdict[],
  provenance: GeneratedProvenance,
): CritiqueReport {
  return {
    id: ctx.idgen.next(),
    branchId,
    batchId: ctx.idgen.next(),
    eraId,
    verdicts,
    createdAt: ctx.clock.now().toISOString(),
    provenance,
  }
}
