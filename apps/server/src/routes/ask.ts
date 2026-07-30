import { askArchivist, runGrandInquiry, World } from '@uchronia/core'
import { AskRequest, InquiryRequest } from '@uchronia/schemas'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { ApiError } from '../http-error.js'
import { traceSink } from '../trace-sink.js'

/**
 * Interrogation (v2/M23). The archivist answers and keeps nothing: a question
 * is the reader's, not the chronicle's. An inquiry is a finding, so it is
 * saved to the artifact shelf and travels with the export.
 */
export function askRoutes(deps: ServerDeps): Hono {
  const app = new Hono()

  const worldFor = (branchId: string): World => {
    const timelineId = deps.repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = deps.repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return World.fromAggregate(aggregate)
  }

  const ctx = (signal: AbortSignal, branchId: string) => ({
    provider: deps.provider,
    idgen: deps.idgen,
    clock: deps.clock,
    signal,
    onTrace: traceSink(deps, branchId, null),
  })

  app.post('/branches/:branchId/ask', async (c) => {
    const branchId = c.req.param('branchId')
    const body = AskRequest.parse(await c.req.json())
    const world = worldFor(branchId)
    const answer = await askArchivist(
      ctx(c.req.raw.signal, branchId),
      world,
      branchId,
      body.question,
    )
    return c.json(answer)
  })

  app.post('/branches/:branchId/inquiry', async (c) => {
    const branchId = c.req.param('branchId')
    const body = InquiryRequest.parse(await c.req.json())
    const world = worldFor(branchId)
    const inquiry = await runGrandInquiry(
      ctx(c.req.raw.signal, branchId),
      world,
      branchId,
      body.thesis,
    )

    // A finding is saved so it can be read again, cited, and exported. It
    // hangs off the branch's latest visible event, which is the closest thing
    // a whole-branch question has to a place on the ledger.
    const anchorEvent = world.resolveEvents(branchId).at(-1)
    if (!anchorEvent)
      throw new ApiError(409, 'conflict', 'this branch has no history to inquire into')
    const artifact = {
      id: deps.idgen.next(),
      eventId: anchorEvent.id,
      kind: 'inquiry' as const,
      title: body.thesis.length > 80 ? `${body.thesis.slice(0, 77)}…` : body.thesis,
      body: {
        kind: 'inquiry' as const,
        thesis: body.thesis,
        verdict: inquiry.verdict,
        confidence: inquiry.confidence,
        chain: inquiry.chain,
        counterConsiderations: inquiry.counterConsiderations,
        citations: inquiry.citations,
      },
      stylingHints: { tone: null, period: null },
      provenance: inquiry.provenance,
    }
    deps.repo.insertArtifact(artifact)
    return c.json({ artifact }, 201)
  })

  return app
}
