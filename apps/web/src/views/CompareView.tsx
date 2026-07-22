import { useQuery } from '@tanstack/react-query'
import type { BaselineAnchor, EventView } from '@uchronia/schemas'
import { clsx } from 'clsx'
import { useMemo } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { api } from '../lib/api.js'
import { formatYear } from '../lib/format.js'

interface YearRow {
  year: number
  a: EventView[]
  b: EventView[] | BaselineAnchor[]
}

/** V6 — Compare: two spines, one scroll; shared prefix washed in record blue. */
export function CompareView() {
  const { timelineId = '' } = useParams()
  const [params] = useSearchParams()
  const a = params.get('a') ?? ''
  const b = params.get('b') ?? 'baseline'

  const compare = useQuery({
    queryKey: ['compare', a, b],
    queryFn: () => api.compare(a, b),
    enabled: a.length > 0,
  })

  const rows = useMemo<YearRow[]>(() => {
    const data = compare.data
    if (!data) return []
    const byYear = new Map<number, YearRow>()
    const rowFor = (year: number): YearRow => {
      let row = byYear.get(year)
      if (!row) {
        row = { year, a: [], b: [] }
        byYear.set(year, row)
      }
      return row
    }
    for (const event of data.a.events) rowFor(event.date.year).a.push(event)
    if ('baseline' in data.b) {
      for (const anchor of data.b.anchors) (rowFor(anchor.year).b as BaselineAnchor[]).push(anchor)
    } else {
      for (const event of data.b.events) (rowFor(event.date.year).b as EventView[]).push(event)
    }
    return [...byYear.values()].sort((x, y) => x.year - y.year)
  }, [compare.data])

  if (!a) {
    return (
      <Shell>
        <EmptyState title="Nothing to compare.">Pick two branches from the delta view.</EmptyState>
      </Shell>
    )
  }
  if (compare.isLoading)
    return (
      <Shell>
        <EmptyState title="Aligning the ledgers…" />
      </Shell>
    )
  if (compare.isError || !compare.data)
    return (
      <Shell>
        <ErrorState
          message={(compare.error as Error)?.message ?? 'unknown'}
          retry={() => compare.refetch()}
        />
      </Shell>
    )

  const data = compare.data
  const shared = new Set(data.sharedEventIds)
  const versusBaseline = 'baseline' in data.b
  const bLabel = versusBaseline ? 'the record' : 'branch' in data.b ? data.b.branch.name : ''

  return (
    <Shell
      breadcrumb={
        <span>
          <Link to="/" className="hover:text-ink">
            atlas
          </Link>
          {' ▸ '}
          <Link to={`/t/${timelineId}/b/${a}`} className="hover:text-ink">
            {data.timeline.title}
          </Link>
          {' ▸ compare'}
        </span>
      }
    >
      <div className="pt-8">
        <h1 className="text-[22px] font-semibold">
          {data.a.branch.name} <span className="font-fell text-thread">against</span> {bLabel}
        </h1>
        <p className="mt-1 text-[14.5px] text-ink-faded">
          {versusBaseline
            ? 'The divergent line read against the attested record.'
            : data.divergesAfterEventId
              ? 'The lines share their opening; the wash marks what both histories hold.'
              : 'Two lines of the same divergence.'}
        </p>

        <div className="mt-5 grid grid-cols-[64px_1fr_1fr] gap-x-4 border-b border-rule pb-1 font-data text-[12.5px] text-ink-faded">
          <span />
          <span className="border-l-2 border-thread pl-2">{data.a.branch.name}</span>
          <span
            className={clsx(
              'pl-2',
              versusBaseline ? 'border-l-2 border-record text-record' : 'border-l-2 border-thread',
            )}
          >
            {bLabel}
          </span>
        </div>

        <div className="divide-y divide-rule/60">
          {rows.map((row) => (
            <div key={row.year} className="grid grid-cols-[64px_1fr_1fr] gap-x-4 py-2">
              <span className="pt-[2px] text-right font-data text-[12.5px] text-ink-faded">
                {formatYear(row.year)}
              </span>
              <div className="space-y-2 border-l-2 border-thread/40 pl-2">
                {row.a.map((event) => (
                  <CompareCell
                    key={event.id}
                    title={event.title}
                    summary={event.summary}
                    shared={shared.has(event.id)}
                    href={`/t/${timelineId}/b/${a}/e/${event.id}`}
                  />
                ))}
              </div>
              <div
                className={clsx(
                  'space-y-2 pl-2',
                  versusBaseline ? 'border-l-2 border-record/40' : 'border-l-2 border-thread/40',
                )}
              >
                {(row.b as Array<EventView | BaselineAnchor>).map((item) =>
                  'summary' in item && 'id' in item && !('flags' in item) ? (
                    <p key={item.id} className="font-data text-[12.5px] leading-snug text-record">
                      {item.title}
                      <span className="mt-0.5 block text-record/75">{item.summary}</span>
                    </p>
                  ) : (
                    <CompareCell
                      key={(item as EventView).id}
                      title={(item as EventView).title}
                      summary={(item as EventView).summary}
                      shared={shared.has((item as EventView).id)}
                      href={
                        versusBaseline
                          ? undefined
                          : `/t/${timelineId}/b/${b}/e/${(item as EventView).id}`
                      }
                    />
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function CompareCell({
  title,
  summary,
  shared,
  href,
}: {
  title: string
  summary: string
  shared: boolean
  href?: string | undefined
}) {
  const body = (
    <div className={clsx('rounded-[2px] px-2 py-1', shared && 'bg-record-wash')}>
      <p className="text-[14.5px] font-medium leading-snug">
        {title}
        {shared && <span className="ml-2 stamp text-record">shared</span>}
      </p>
      <p className="line-clamp-2 text-[13px] text-ink-faded">{summary}</p>
    </div>
  )
  return href ? (
    <Link to={href} className="block hover:bg-paper-raised">
      {body}
    </Link>
  ) : (
    body
  )
}
