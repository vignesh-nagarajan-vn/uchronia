import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { api } from '../lib/api.js'
import { useBranchView } from './TimelineView.js'

/** V4 - the dossier: state ledger (each line linked to its event) + biography. */
export function Dossier() {
  const { timelineId = '', branchId = '', entityId = '' } = useParams()
  const view = useBranchView(branchId)
  const queryClient = useQueryClient()
  const branchPath = `/t/${timelineId}/b/${branchId}`

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
        <h1 className="mt-1 text-[26px] font-semibold leading-tight">{entity.name}</h1>
        <p className="mt-1 text-[15.5px] text-ink-faded">{entity.description}</p>

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
