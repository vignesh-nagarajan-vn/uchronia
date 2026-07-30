import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { api } from '../lib/api.js'
import { formatYear } from '../lib/format.js'
import { useBranchView } from './TimelineView.js'

/** V4 - the dossier: state ledger (each line linked to its event) + biography. */
export function Dossier() {
  const { timelineId = '', branchId = '', entityId = '' } = useParams()
  const view = useBranchView(branchId)
  const queryClient = useQueryClient()
  const branchPath = `/t/${timelineId}/b/${branchId}`

  const fates = useQuery({
    queryKey: ['entity-fates', branchId, entityId],
    queryFn: () => api.entityFates(branchId, entityId),
    staleTime: 30_000,
  })

  const writeBio = useMutation({
    mutationFn: () => api.biography(branchId, entityId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['branch-view', branchId] }),
  })

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
  const entity = data.entities.find((e) => e.id === entityId)
  if (!entity) {
    return (
      <Shell>
        <EmptyState title="No dossier under that name on this branch.">
          <Link to={branchPath} className="underline underline-offset-4">
            Back to the timeline
          </Link>
        </EmptyState>
      </Shell>
    )
  }
  const biography = data.biographies.find((b) => b.entityId === entityId)
  const ended = entity.endedByEventId
    ? data.events.find((e) => e.id === entity.endedByEventId)
    : undefined
  const predecessor = entity.succeedsSlug
    ? data.entities.find((e) => e.slug === entity.succeedsSlug)
    : undefined

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
          {' ▸ dossier'}
        </span>
      }
    >
      <article className="mx-auto max-w-[720px] pt-8">
        <p className="font-data text-[13px] text-ink-faded">
          dossier · {entity.type} · {entity.slug}
        </p>
        <div className="mt-1 flex items-start gap-4">
          {/* Procedural arms (v2/M20): derived from the slug, so a house looks
              the same everywhere it appears and nothing is stored for it. */}
          <img
            src={`/api/arms/${entity.slug}?size=72`}
            alt=""
            width={72}
            height={72}
            className="mt-1 shrink-0"
            data-testid="entity-arms"
          />
          <div className="min-w-0">
            <h1 className="text-[26px] font-semibold leading-tight">{entity.name}</h1>
            <p className="mt-1 text-[15.5px] text-ink-faded">{entity.description}</p>
          </div>
        </div>

        {/* Lives (v2/M18): when it began, whether it ever existed, whom it
            follows, and what it held. A reader is entitled to know which of
            these actors the divergence invented. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {entity.bornYear !== null && (
            <span className="font-data text-[12px] text-ink-faded">
              {entity.type === 'person' ? 'born' : 'founded'} {formatYear(entity.bornYear)}
              {ended && `, ended ${formatYear(ended.date.year)}`}
            </span>
          )}
          {entity.counterfactual && (
            <span
              className="stamp text-notice"
              title="This actor has no attested counterpart; the divergence produced them."
              data-testid="counterfactual-mark"
            >
              no counterpart in the record
            </span>
          )}
          {predecessor && (
            <span className="font-data text-[12px] text-ink-faded">
              follows{' '}
              <Link
                to={`${branchPath}/entity/${predecessor.id}`}
                className="underline decoration-rule underline-offset-2 hover:text-ink"
              >
                {predecessor.name}
              </Link>
            </span>
          )}
        </div>

        {entity.tenures.length > 0 && (
          <section className="mt-6" aria-label="offices held" data-testid="tenures">
            <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
              offices held, as this branch records them
            </h2>
            <ul className="mt-2 space-y-1">
              {entity.tenures.map((tenure) => (
                <li
                  key={`${tenure.role}-${tenure.startYear}`}
                  className="flex items-baseline justify-between gap-3 border-b border-rule/50 py-1"
                >
                  <span className="text-[14.5px]">{tenure.role}</span>
                  <span className="font-data text-[12.5px] text-ink-faded">
                    {formatYear(tenure.startYear)}
                    {tenure.endYear === null ? ' onward' : ` to ${formatYear(tenure.endYear)}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Across branches (v2/M19): what became of this actor everywhere the
            timeline forked. Pure computation, so it costs nothing to show. */}
        {fates.data && fates.data.fates.length > 1 && (
          <section className="mt-6" aria-label="across branches" data-testid="entity-fates">
            <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
              across branches
            </h2>
            <table className="mt-2 w-full text-left">
              <thead>
                <tr className="font-data text-[11.5px] text-ink-faded">
                  <th className="py-1 font-normal">branch</th>
                  <th className="py-1 font-normal">standing</th>
                  <th className="py-1 font-normal">defining event</th>
                  <th className="py-1 text-right font-normal">events</th>
                </tr>
              </thead>
              <tbody>
                {fates.data.fates.map((fate) => (
                  <tr key={fate.branchId} className="border-t border-rule/50 align-baseline">
                    <td className="py-1.5 pr-3 text-[14px]">
                      {fate.branchId === branchId ? (
                        <span className="font-medium">{fate.branchName}</span>
                      ) : (
                        <Link
                          to={`/t/${timelineId}/b/${fate.branchId}/entity/${entityId}`}
                          className="underline decoration-rule underline-offset-2 hover:text-ink"
                        >
                          {fate.branchName}
                        </Link>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-[14px]">
                      {fate.standing}
                      {fate.ended && (
                        <span className="ml-2 font-data text-[11.5px] text-ink-faded">
                          ended{fate.endedYear !== null ? ` ${formatYear(fate.endedYear)}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-[14px] text-ink-faded">
                      {fate.definingEvent ?? 'nothing yet'}
                    </td>
                    <td className="py-1.5 text-right font-data text-[12.5px] text-ink-faded">
                      {fate.eventCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-6" aria-label="state as it stands">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the state, as it stands on this branch
          </h2>
          <dl className="mt-2 grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2">
            {Object.entries(entity.state).map(([key, value]) => (
              <div
                key={key}
                className="flex items-baseline justify-between gap-3 border-b border-rule/50 py-1"
              >
                <dt className="font-data text-[12.5px] text-ink-faded">{key}</dt>
                <dd className="text-right text-[14px]">
                  {Array.isArray(value) ? value.join(', ') : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-8" aria-label="the ledger">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the ledger - every recorded change
          </h2>
          {entity.changeLog.length === 0 ? (
            <p className="mt-2 text-[14px] text-ink-faded">
              No changes recorded yet; the entity stands as introduced.
            </p>
          ) : (
            <ol className="mt-2 space-y-2.5">
              {entity.changeLog.map((line, lineIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: append-only ledger; a delta's event and note can both repeat
                <li key={`change-${lineIndex}`} className="grid grid-cols-[84px_1fr] gap-3">
                  <Link
                    to={`${branchPath}/e/${line.eventId}`}
                    className="pt-[2px] text-right font-data text-[12.5px] text-ink-faded hover:text-thread"
                    title="open the event that made this change"
                  >
                    {line.dateLabel}
                  </Link>
                  <div>
                    <p className="text-[14.5px]">{line.note}</p>
                    <p className="font-data text-[12px] text-ink-faded">
                      {Object.entries(line.patch)
                        .map(([k, v]) => `${k} → ${Array.isArray(v) ? v.join(', ') : String(v)}`)
                        .join(' · ')}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-8" aria-label="biography">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the life, as written from inside this timeline
          </h2>
          {biography ? (
            <div className="mt-3 text-[16px] leading-[1.7]">
              {biography.biography.split('\n\n').map((para, paraIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
                <p key={`para-${paraIndex}`} className="mt-3 first:mt-0">
                  {para}
                </p>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => writeBio.mutate()}
              disabled={writeBio.isPending}
              className="mt-3 rounded-[2px] border border-rule px-3 py-1 text-[14px] text-ink-faded hover:bg-paper-raised hover:text-ink disabled:opacity-40"
            >
              {writeBio.isPending ? 'Writing…' : 'Write the biography'}
            </button>
          )}
        </section>
      </article>
    </Shell>
  )
}
