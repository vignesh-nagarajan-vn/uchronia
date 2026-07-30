import type { Artifact, Event } from '@uchronia/schemas'
import { archivistAsk, grandInquiry } from '../prompts/ask.js'
import { tokenize } from '../retrieval.js'
import type { World } from '../world.js'
import { callOpts, makeProvenance, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

/**
 * Interrogation (v2/M23): ask a branch a question and get an answer made of
 * its own record. Both modes share one retrieval pass, because the thing
 * that makes an answer trustworthy is not the prose around it but the
 * citations under it.
 *
 * Every citable thing gets a stable pin (`E3`, `A1`, `C2`) that resolves back
 * to a row the app can open. An answer that cites nothing is allowed and is
 * sometimes correct: the record is often silent.
 */

export interface Citation {
  /** The pin as it appears in the answer text. */
  pin: string
  kind: 'event' | 'artifact' | 'claim'
  id: string
  label: string
}

export interface ContextPack {
  citations: Citation[]
  /** The rendered context the model reads, pins included. */
  text: string
}

/** Word overlap against the question, with the same stopword discipline as intake. */
function relevance(text: string, queryTokens: Set<string>): number {
  if (queryTokens.size === 0) return 0
  let hits = 0
  for (const token of new Set(tokenize(text))) if (queryTokens.has(token)) hits += 1
  return hits
}

/**
 * Retrieve what this branch can actually say about a question. Events lead,
 * because they are the history; artifacts and claims come along when they
 * touch the same words, because they are what makes an answer specific.
 */
export function retrieveContext(
  world: World,
  branchId: string,
  question: string,
  limit = 14,
): ContextPack {
  const queryTokens = new Set(tokenize(question))
  const events = world.resolveEvents(branchId)

  const scored = events
    .map((event) => ({
      event,
      score:
        relevance(`${event.title} ${event.summary} ${event.detail ?? ''}`, queryTokens) +
        // A tie among equally relevant events breaks toward the load-bearing
        // ones, which is what a reader means by "what happened".
        (event.flags.convergence ? 0.5 : 0) +
        (event.flags.disputed ? 0.25 : 0),
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.event.ordinal - b.event.ordinal)
    .slice(0, limit)

  // A question that matches nothing still deserves the spine of the history,
  // so the archivist can say what the branch is about before saying it is silent.
  const chosen: Event[] =
    scored.length > 0 ? scored.map((s) => s.event) : events.slice(0, Math.min(6, events.length))
  chosen.sort((a, b) => a.ordinal - b.ordinal)

  const citations: Citation[] = []
  const lines: string[] = []
  chosen.forEach((event, i) => {
    const pin = `E${i + 1}`
    citations.push({
      pin,
      kind: 'event',
      id: event.id,
      label: `${event.date.label}: ${event.title}`,
    })
    lines.push(`[${pin}] ${event.date.label} - ${event.title}. ${event.detail ?? event.summary}`)
  })

  const chosenIds = new Set(chosen.map((e) => e.id))
  const artifacts: Artifact[] = chosen.flatMap((e) => world.artifactsForEvent(e.id)).slice(0, 4)
  artifacts.forEach((artifact, i) => {
    const pin = `A${i + 1}`
    citations.push({ pin, kind: 'artifact', id: artifact.id, label: artifact.title })
    lines.push(`[${pin}] a ${artifact.kind} from inside this history: "${artifact.title}"`)
  })

  const claims = world
    .resolveClaims(branchId)
    .filter((c) => chosenIds.has(c.eventId))
    .slice(0, 6)
  claims.forEach((claim, i) => {
    const pin = `C${i + 1}`
    const body = claim.body
    const label =
      body.kind === 'regional-index'
        ? `${body.index} in ${body.region}: ${body.value}`
        : body.kind === 'name-drift'
          ? `${body.attested} is called ${body.drifted}`
          : `${body.region} held by ${body.holder} (${body.grip})`
    citations.push({ pin, kind: 'claim', id: claim.id, label })
    lines.push(`[${pin}] ${claim.year}: ${label}. ${body.note}`)
  })

  return { citations, text: lines.join('\n') }
}

export interface ArchivistAnswer {
  answer: string
  citations: Citation[]
  /** True when the archivist declined because the record does not say. */
  silent: boolean
}

export async function askArchivist(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  question: string,
): Promise<ArchivistAnswer> {
  world.getBranch(branchId)
  const pack = retrieveContext(world, branchId, question)
  const generated = await generateStructured(
    ctx.provider,
    archivistAsk,
    {
      podStatement: world.pod.statement,
      question,
      context: pack.text,
      pins: pack.citations.map((c) => c.pin),
    },
    callOpts(ctx),
  )
  // Only pins the answer actually used come back, so the UI never shows a
  // citation list longer than the argument it supports.
  const used = new Set(
    [...generated.value.answer.matchAll(/\[([EAC]\d+)\]/g)].map((m) => m[1] ?? ''),
  )
  return {
    answer: generated.value.answer,
    citations: pack.citations.filter((c) => used.has(c.pin)),
    silent: generated.value.silent,
  }
}

export interface Inquiry {
  verdict: string
  confidence: number
  chain: Array<{ pin: string; claim: string }>
  counterConsiderations: string[]
  citations: Citation[]
  provenance: ReturnType<typeof makeProvenance>
}

export async function runGrandInquiry(
  ctx: PipelineCtx,
  world: World,
  branchId: string,
  thesis: string,
): Promise<Inquiry> {
  world.getBranch(branchId)
  const pack = retrieveContext(world, branchId, thesis, 20)
  const generated = await generateStructured(
    ctx.provider,
    grandInquiry,
    {
      podStatement: world.pod.statement,
      thesis,
      context: pack.text,
      pins: pack.citations.map((c) => c.pin),
    },
    callOpts(ctx),
  )
  const value = generated.value
  const used = new Set(value.chain.map((step) => step.pin))
  return {
    verdict: value.verdict,
    confidence: value.confidence,
    chain: value.chain,
    counterConsiderations: value.counterConsiderations,
    citations: pack.citations.filter((c) => used.has(c.pin)),
    provenance: makeProvenance(ctx, grandInquiry, generated.model),
  }
}
