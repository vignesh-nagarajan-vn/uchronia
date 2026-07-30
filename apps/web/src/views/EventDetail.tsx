import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ARTIFACT_KINDS, type ArtifactKind, type BranchView } from '@uchronia/schemas'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ForkDialog } from '../components/ForkDialog.js'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import {
  ContestedMark,
  ConvergenceGlyph,
  DisputedMark,
  LensTicks,
  PlausibilityStamp,
  WildcardMark,
} from '../components/Stamp.js'
import { api } from '../lib/api.js'
import { describeLateness } from '../lib/format.js'
import { useBranchView } from './TimelineView.js'

/** V3 - the event unfolded: narrative, causal neighborhood, artifacts, critique. */
export function EventDetail() {
  const { timelineId = '', branchId = '', eventId = '' } = useParams()
  const view = useBranchView(branchId)
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [forking, setForking] = useState(false)
  const [flip, setFlip] = useState('')
  const branchPath = `/t/${timelineId}/b/${branchId}`

  // The pulse is a forecast, so it is deliberately not cached into the branch
  // view: it belongs to the reader's question, not to the ledger.
  const pulse = useMutation({
    mutationFn: () => api.pulse(branchId, eventId, flip.trim()),
  })
  // The glosses are fill-once on the server, so the mutation's own result is
  // the freshest view of them; the branch view supplies whatever was already
  // written on an earlier visit.
  const interpret = useMutation({
    mutationFn: () => api.interpretations(branchId, eventId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['branch-view', branchId] }),
  })

  const expand = useMutation({
    mutationFn: () => api.expandEvent(branchId, eventId),
    // Patch the one event rather than refetching the whole branch view.
    onSuccess: (expanded) =>
      queryClient.setQueryData<BranchView>(['branch-view', branchId], (old) =>
        old
          ? {
              ...old,
              events: old.events.map((e) =>
                e.id === expanded.id ? { ...e, detail: expanded.detail } : e,
              ),
            }
          : old,
      ),
  })
  const makeArtifact = useMutation({
    mutationFn: (kind: ArtifactKind) => api.generateArtifact(branchId, eventId, kind),
    onSuccess: (artifact) => {
      queryClient.setQueryData<BranchView>(['branch-view', branchId], (old) =>
        old && !old.artifacts.some((a) => a.id === artifact.id)
          ? { ...old, artifacts: [...old.artifacts, artifact] }
          : old,
      )
      navigate(`${branchPath}/artifact/${artifact.id}`)
    },
  })
  const regenerate = useMutation({
    mutationFn: () => api.regenerateEvent(branchId, eventId),
    onSuccess: (fresh) =>
      queryClient.setQueryData<BranchView>(['branch-view', branchId], (old) =>
        old ? { ...old, events: old.events.map((e) => (e.id === fresh.id ? fresh : e)) } : old,
      ),
  })
  const [copied, setCopied] = useState(false)

  if (view.isLoading)
    return (
      <Shell>
        <EmptyState title="Fetching the ledger…" />
      </Shell>
    )
  if (view.isError || !view.data)
    return (
      <Shell>
        <ErrorState
          message={(view.error as Error)?.message ?? 'unknown'}
          retry={() => view.refetch()}
        />
      </Shell>
    )

  const data = view.data
  const event = data.events.find((e) => e.id === eventId)
  if (!event) {
    return (
      <Shell>
        <EmptyState title="No such entry in this ledger.">
          <Link to={branchPath} className="underline underline-offset-4">
            Back to the timeline
          </Link>
        </EmptyState>
      </Shell>
    )
  }

  const eventIndex = data.events.findIndex((e) => e.id === eventId)
  const previous = eventIndex > 0 ? data.events[eventIndex - 1] : undefined
  const next = eventIndex >= 0 ? data.events[eventIndex + 1] : undefined
  const ownEvent = event.branchId === branchId

  const edgeById = new Map(data.edges.map((e) => [e.id, e]))
  const eventById = new Map(data.events.map((e) => [e.id, e]))
  const causes = event.causes
    .map((id) => edgeById.get(id))
    .filter((e) => e !== undefined)
    .map((edge) => ({ edge, event: eventById.get(edge.fromEventId) }))
  const effects = event.effects
    .map((id) => edgeById.get(id))
    .filter((e) => e !== undefined)
    .map((edge) => ({ edge, event: eventById.get(edge.toEventId) }))
  const artifacts = data.artifacts.filter((a) => a.eventId === event.id)
  const convergence = data.convergences.find((c) => c.eventId === event.id)
  const courtRecord = data.courtRecords.find((r) => r.eventId === event.id)
  const contestedNote = event.criticNotes?.find((n) => n.type === 'contested')?.note
  const nameDrifts = data.claims.filter(
    (c) => c.eventId === event.id && c.body.kind === 'name-drift',
  )
  const stored = data.interpretations.filter((i) => i.eventId === event.id)
  const glosses =
    interpret.data ??
    (stored.length > 0 ? { schools: data.schools, interpretations: stored } : null)

  return (
    <Shell
      breadcrumb={
        <span>
          <Link to="/" className="hover:text-ink">
            atlas
          </Link>
          {' ▸ '}
          <Link to={branchPath} className="hover:text-ink">
            {data.timeline.title}
          </Link>
          {' ▸ '}
          <span className="text-ink">{event.date.label}</span>
        </span>
      }
    >
      <article className="mx-auto max-w-[720px] pt-8">
        <nav
          aria-label="walk the ledger"
          className="flex items-baseline justify-between gap-4 border-b border-rule pb-2 font-data text-[12.5px]"
        >
          {previous ? (
            <Link
              to={`${branchPath}/e/${previous.id}`}
              className="min-w-0 truncate text-ink-faded hover:text-ink"
            >
              ← {previous.title}
            </Link>
          ) : (
            <span className="text-ink-faded/50">the divergence is the beginning</span>
          )}
          {next ? (
            <Link
              to={`${branchPath}/e/${next.id}`}
              className="min-w-0 truncate text-right text-ink-faded hover:text-ink"
            >
              {next.title} →
            </Link>
          ) : (
            <span className="text-right text-ink-faded/50">the horizon, for now</span>
          )}
        </nav>
        <p className="mt-6 font-data text-[13px] text-ink-faded">{event.date.label}</p>
        <h1 className="mt-1 text-[26px] font-semibold leading-tight">{event.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <LensTicks lenses={event.lenses} />
          <PlausibilityStamp score={event.plausibility.score} />
          {event.wildcard && <WildcardMark />}
          {event.flags.convergence && <ConvergenceGlyph note={convergence?.similarityNote} />}
          {event.flags.disputed && <DisputedMark withNotes={false} />}
          {event.flags.contested && <ContestedMark note={contestedNote} />}
        </div>
        <p className="mt-1 font-data text-[12px] text-ink-faded">{event.plausibility.rationale}</p>

        <div className="mt-6 border-t border-rule pt-5 text-[16.5px] leading-[1.7]">
          <p>{event.summary}</p>
          {event.detail ? (
            event.detail.split('\n\n').map((para, paraIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
              <p key={`para-${paraIndex}`} className="mt-4">
                {para}
              </p>
            ))
          ) : (
            <button
              type="button"
              onClick={() => expand.mutate()}
              disabled={expand.isPending}
              className="mt-4 rounded-[2px] border border-rule px-3 py-1 text-[14px] text-ink-faded hover:bg-paper-raised hover:text-ink disabled:opacity-40"
            >
              {expand.isPending ? 'Expanding…' : 'Expand'}
            </button>
          )}
        </div>

        {/* Convergence 2.0 (v2/M18): which attractor pulled, how far off the
            attested schedule it landed, and whether the road itself differed. */}
        {convergence && (
          <aside
            className="mt-6 border-l-2 border-record bg-record-wash px-4 py-3"
            data-testid="convergence-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="stamp text-record">◉ convergence with the record</p>
              <p className="font-data text-[11.5px] text-record">
                {convergence.attractor} attractor · {describeLateness(convergence.latenessYears)}
              </p>
            </div>
            <p className="mt-1 text-[14.5px]">{convergence.similarityNote}</p>
            {convergence.pathNote && (
              <p className="mt-1.5 text-[14.5px] text-ink-faded">{convergence.pathNote}</p>
            )}
          </aside>
        )}

        {/* Name drift (v2/M18): the vocabulary this history moved, glossed. */}
        {nameDrifts.length > 0 && (
          <aside className="mt-6 border-l-2 border-rule px-4 py-3" data-testid="name-drift">
            <p className="stamp text-ink-faded">the record calls it otherwise</p>
            <dl className="mt-2 space-y-2">
              {nameDrifts.map((claim) => (
                <div key={claim.id}>
                  <dt className="text-[15px]">
                    {claim.body.kind === 'name-drift' && (
                      <>
                        <span className="font-semibold">{claim.body.drifted}</span>
                        <span className="text-ink-faded">
                          {' '}
                          ({claim.body.nameKind}; attested as {claim.body.attested})
                        </span>
                      </>
                    )}
                  </dt>
                  <dd className="text-[14px] text-ink-faded">
                    {claim.body.kind === 'name-drift' && claim.body.note}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        )}

        {event.flags.disputed && event.criticNotes && (
          <aside
            className="mt-6 border-l-2 border-thread bg-thread-wash px-4 py-3"
            aria-label="critic notes"
          >
            <p className="stamp text-thread">disputed - the critic's notes, attached</p>
            <ul className="mt-2 space-y-2">
              {event.criticNotes.map((note, noteIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static critique list; two notes can share their text
                <li key={`note-${noteIndex}`} className="text-[14.5px]">
                  <span className="font-data text-[12px] text-thread">
                    {note.type} · {note.severity}
                  </span>
                  <br />
                  {note.note}
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* The Court of Plausibility's transcript (v2/M17): both briefs and the
            ruling, in the register of a record rather than a chat log. */}
        {courtRecord && (
          <section
            className="mt-6 border border-rule bg-paper-raised px-4 py-3"
            aria-label="court record"
            data-testid="court-record"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="stamp text-ink-faded">the court of plausibility</p>
              <p className="font-data text-[11.5px] text-ink-faded">
                ruling: {courtRecord.ruling.outcome}
              </p>
            </div>
            <dl className="mt-3 space-y-3 text-[14.5px] leading-relaxed">
              <div>
                <dt className="font-data text-[12px] text-ink-faded">for the event</dt>
                <dd className="mt-0.5">{courtRecord.advocate}</dd>
              </div>
              <div>
                <dt className="font-data text-[12px] text-ink-faded">against</dt>
                <dd className="mt-0.5">{courtRecord.skeptic}</dd>
              </div>
              <div>
                <dt className="font-data text-[12px] text-ink-faded">the ruling</dt>
                <dd className="mt-0.5">{courtRecord.ruling.opinion}</dd>
              </div>
              {courtRecord.ruling.instruction && (
                <div>
                  <dt className="font-data text-[12px] text-ink-faded">as instructed</dt>
                  <dd className="mt-0.5">{courtRecord.ruling.instruction}</dd>
                </div>
              )}
            </dl>
          </section>
        )}

        <section className="mt-8 grid gap-6 sm:grid-cols-2" aria-label="causal neighborhood">
          <div>
            <h2 className="font-data text-[13px] text-ink-faded">causes ({causes.length})</h2>
            <ul className="mt-2 space-y-2">
              {causes.length === 0 && <li className="text-[14px] text-ink-faded">none recorded</li>}
              {causes.map(({ edge, event: cause }) =>
                cause ? (
                  <li key={edge.id}>
                    <span className="font-data text-[11.5px] text-thread">
                      {edge.kind} · {edge.strength.toFixed(2)}
                    </span>
                    <br />
                    <Link
                      to={`${branchPath}/e/${cause.id}`}
                      className="text-[15px] hover:underline underline-offset-4"
                    >
                      {cause.title}
                    </Link>
                    <span className="ml-2 font-data text-[12px] text-ink-faded">
                      {cause.date.label}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
          <div>
            <h2 className="font-data text-[13px] text-ink-faded">
              what it shaped ({effects.length})
            </h2>
            <ul className="mt-2 space-y-2">
              {effects.length === 0 && <li className="text-[14px] text-ink-faded">nothing yet</li>}
              {effects.map(({ edge, event: effect }) =>
                effect ? (
                  <li key={edge.id}>
                    <span className="font-data text-[11.5px] text-thread">
                      {edge.kind} · {edge.strength.toFixed(2)}
                    </span>
                    <br />
                    <Link
                      to={`${branchPath}/e/${effect.id}`}
                      className="text-[15px] hover:underline underline-offset-4"
                    >
                      {effect.title}
                    </Link>
                    <span className="ml-2 font-data text-[12px] text-ink-faded">
                      {effect.date.label}
                    </span>
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </section>

        <section className="mt-8" aria-label="those involved">
          <h2 className="font-data text-[13px] text-ink-faded">those involved</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {event.entityIds.map((id) => {
              const entity = data.entities.find((e) => e.id === id)
              if (!entity) return null
              return (
                <Link
                  key={id}
                  to={`${branchPath}/entity/${id}`}
                  className="rounded-[2px] border border-rule px-2 py-1 text-[13.5px] hover:bg-paper-raised"
                >
                  {entity.name}
                  <span className="ml-1.5 font-data text-[11px] text-ink-faded">{entity.type}</span>
                </Link>
              )
            })}
          </div>
        </section>

        <section className="mt-8" aria-label="artifact shelf">
          <h2 className="font-data text-[13px] text-ink-faded">the artifact shelf</h2>
          {artifacts.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {artifacts.map((artifact) => (
                <li key={artifact.id}>
                  <Link
                    to={`${branchPath}/artifact/${artifact.id}`}
                    className="text-[15px] hover:underline underline-offset-4"
                  >
                    {artifact.title}
                  </Link>
                  <span className="ml-2 font-data text-[12px] text-ink-faded">{artifact.kind}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {ARTIFACT_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => makeArtifact.mutate(kind)}
                disabled={makeArtifact.isPending}
                className="rounded-[2px] border border-rule px-2.5 py-1 font-data text-[12px] text-ink-faded hover:bg-paper-raised hover:text-ink disabled:opacity-40"
                data-testid={`generate-${kind}`}
              >
                {makeArtifact.isPending && makeArtifact.variables === kind
                  ? 'forging…'
                  : `+ ${kind}`}
              </button>
            ))}
          </div>
        </section>

        {/* In-world historiography (v2/M20): how this world's own rival
            schools read the event. Fill-once, so the argument stays put. */}
        <section className="mt-8" aria-label="interpretations">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-1">
            <h2 className="font-data text-[13px] text-ink-faded">how the schools read it</h2>
            {!glosses && (
              <button
                type="button"
                onClick={() => interpret.mutate()}
                disabled={interpret.isPending}
                data-testid="interpret-button"
                className="font-data text-[11.5px] text-ink-faded underline decoration-rule underline-offset-2 hover:text-ink disabled:opacity-40"
              >
                {interpret.isPending ? 'asking the schools…' : 'ask the schools'}
              </button>
            )}
          </div>
          {glosses ? (
            <div className="mt-3 space-y-4" data-testid="interpretations">
              {glosses.interpretations.map((gloss) => {
                const school = glosses.schools.find((s) => s.id === gloss.schoolId)
                return (
                  <article key={gloss.id}>
                    <h3 className="text-[15px] font-semibold">{school?.name ?? 'a school'}</h3>
                    {school && (
                      <p className="font-data text-[11.5px] text-ink-faded">
                        {school.seat} · holds that {school.stance}
                      </p>
                    )}
                    <p className="mt-1 text-[15px] leading-relaxed">{gloss.gloss}</p>
                  </article>
                )
              })}
              <p className="font-data text-[11.5px] text-ink-faded">
                These are schools inside this history. None of them knows ours, and none of them is
                right.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-[14px] text-ink-faded">
              Every history that gets written down gets argued about. Ask this one's historians what
              they make of the event.
            </p>
          )}
          {interpret.isError && (
            <p className="mt-2 text-[14px] text-thread">
              The schools did not answer: {(interpret.error as Error)?.message ?? 'unknown'}
            </p>
          )}
        </section>

        {/* The counterfactual pulse (v2/M19): a forecast, not a fork. Rendered
            as a ghost of the ledger's own register (dashed, unfilled) so it
            reads as something that has not happened. */}
        <section className="mt-8" aria-label="counterfactual pulse">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            pulse this event
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              value={flip}
              onChange={(e) => setFlip(e.target.value)}
              placeholder="what if this had not happened?"
              aria-label="the flip"
              className="min-w-0 flex-1 rounded-[2px] border border-rule bg-paper px-2 py-1 text-[14px] placeholder:text-ink-faded/70"
            />
            <button
              type="button"
              onClick={() => pulse.mutate()}
              disabled={pulse.isPending}
              data-testid="pulse-button"
              title="One forecast of what this flip would move. Nothing is committed."
              className="rounded-[2px] border border-rule px-3 py-1 text-[14px] text-ink-faded hover:bg-paper-raised hover:text-ink disabled:opacity-40"
            >
              {pulse.isPending ? 'Pulsing…' : 'Pulse'}
            </button>
          </div>
          {pulse.data && (
            <div
              className="mt-3 rounded-[2px] border border-dashed border-thread/60 px-4 py-3"
              data-testid="pulse-card"
            >
              <p className="stamp text-thread">a forecast, not a record</p>
              <p className="mt-1 text-[15px]">{pulse.data.headline}</p>
              <ul className="mt-2 space-y-1">
                {pulse.data.deltas.map((delta) => (
                  <li
                    key={`${delta.kind}-${delta.subject}-${delta.effect}`}
                    className="flex items-baseline gap-2 text-[14px]"
                  >
                    <span className="font-data text-[11.5px] text-ink-faded">{delta.kind}</span>
                    <span className="min-w-0">
                      <span className="font-medium">{delta.subject}</span> {delta.effect}
                    </span>
                    <span className="ml-auto shrink-0 font-data text-[11.5px] text-ink-faded">
                      {delta.confidence.toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              {pulse.data.breaks.length > 0 && (
                <p className="mt-2 font-data text-[11.5px] text-record">
                  likely breaks: {pulse.data.breaks.join(', ')}
                </p>
              )}
              <button
                type="button"
                onClick={() => setForking(true)}
                data-testid="commit-fork"
                className="mt-3 rounded-[2px] border border-thread px-3 py-1 text-[14px] font-medium text-thread hover:bg-thread-wash"
              >
                Commit this fork
              </button>
            </div>
          )}
          {pulse.isError && (
            <p className="mt-2 text-[14px] text-thread">
              The pulse failed: {(pulse.error as Error)?.message ?? 'unknown'}
            </p>
          )}
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-rule pt-4">
          <button
            type="button"
            onClick={() => setForking(true)}
            className="rounded-[2px] border border-thread px-4 py-1.5 text-[15px] font-medium text-thread hover:bg-thread-wash"
          >
            Fork here
          </button>
          {ownEvent && (
            <button
              type="button"
              onClick={() => regenerate.mutate()}
              disabled={regenerate.isPending}
              className="rounded-[2px] border border-rule px-4 py-1.5 text-[15px] text-ink-faded hover:bg-paper-raised hover:text-ink disabled:opacity-40"
              title="a fresh telling of this event: same position, same causes, new texture"
            >
              {regenerate.isPending ? 'Retelling…' : 'Tell it again'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(window.location.href).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 2000)
              })
            }}
            className="rounded-[2px] border border-rule px-4 py-1.5 font-data text-[13px] text-ink-faded hover:bg-paper-raised hover:text-ink"
          >
            {copied ? 'copied' : 'copy link'}
          </button>
          {regenerate.isError && (
            <p className="w-full font-data text-[12px] text-thread" role="alert">
              The retelling failed: {(regenerate.error as Error).message}
            </p>
          )}
        </div>
      </article>

      {forking && (
        <ForkDialog
          event={event}
          branchId={branchId}
          timelineId={timelineId}
          onClose={() => setForking(false)}
          // A pulse the reader accepted opens the fork already worded.
          initialSubPod={pulse.data?.suggestedSubPod ?? ''}
        />
      )}
    </Shell>
  )
}
