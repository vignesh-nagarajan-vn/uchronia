import { useQuery } from '@tanstack/react-query'
import type { BaselineAnchor } from '@uchronia/schemas'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { api } from '../lib/api.js'
import { formatYear } from '../lib/format.js'

/**
 * The record room (v2/M16): a read-only browse of the curated baseline so a
 * human can review the expanded dataset. Filter by era, region, theme, and
 * magnitude; full-text search; a flag affordance copies a structured report
 * line to the clipboard. Deliberately no CRUD: the record is edited in the
 * repository, with review.
 */

/** Coarse era buckets for the filter row. Half-open: [start, end). */
const ERA_BOUNDS: Record<string, [number, number]> = {
  ancient: [-4000, 500],
  medieval: [500, 1500],
  'early modern': [1500, 1800],
  'nineteenth century': [1800, 1900],
  'twentieth century': [1900, 2000],
  'this century': [2000, 2100],
}

export function RecordView() {
  const baseline = useQuery({
    queryKey: ['baseline'],
    queryFn: api.baseline,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const [search, setSearch] = useState('')
  const [region, setRegion] = useState('')
  const [tag, setTag] = useState('')
  const [minMagnitude, setMinMagnitude] = useState(1)
  const [era, setEra] = useState('')
  const [flagged, setFlagged] = useState<string | null>(null)

  const anchors = baseline.data?.anchors ?? []
  const regions = useMemo(() => [...new Set(anchors.map((a) => a.region))].sort(), [anchors])
  const tags = useMemo(() => [...new Set(anchors.flatMap((a) => a.tags))].sort(), [anchors])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const bounds = era ? ERA_BOUNDS[era] : undefined
    return anchors.filter((a) => {
      if (bounds && (a.year < bounds[0] || a.year >= bounds[1])) return false
      if (region && !a.regions.includes(region as BaselineAnchor['regions'][number])) return false
      if (tag && !a.tags.includes(tag)) return false
      if (a.magnitude < minMagnitude) return false
      if (
        query &&
        !a.title.toLowerCase().includes(query) &&
        !a.summary.toLowerCase().includes(query)
      )
        return false
      return true
    })
  }, [anchors, search, region, tag, minMagnitude, era])

  const flag = (anchor: BaselineAnchor) => {
    const line = `BASELINE FLAG ${anchor.id} (${formatYear(anchor.year)} "${anchor.title}"): <what is wrong>`
    void navigator.clipboard.writeText(line).then(() => {
      setFlagged(anchor.id)
      setTimeout(() => setFlagged(null), 1500)
    })
  }

  if (baseline.isError) {
    return (
      <Shell breadcrumb={<span className="text-ink">the record</span>}>
        <ErrorState
          message={baseline.error instanceof Error ? baseline.error.message : 'baseline failed'}
          retry={() => void baseline.refetch()}
        />
      </Shell>
    )
  }

  return (
    <Shell
      breadcrumb={
        <span>
          <Link to="/" className="hover:text-ink">
            atlas
          </Link>
          {' ▸ '}
          <span className="text-ink">the record</span>
        </span>
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-2">
        <h1 className="text-[19px] font-semibold text-record">The record</h1>
        <p className="font-data text-[12px] text-ink-faded">
          {filtered.length} of {anchors.length} curated anchors · flagging copies a report line
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search the record"
          aria-label="search anchors by title or summary"
          className="w-[220px] rounded-[2px] border border-rule bg-paper px-2 py-0.5 font-data text-[12px]"
        />
        <select
          value={era}
          onChange={(e) => setEra(e.target.value)}
          aria-label="era filter"
          className="rounded-[2px] border border-rule bg-paper px-2 py-0.5 font-data text-[12px]"
        >
          <option value="">every era</option>
          {Object.keys(ERA_BOUNDS).map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="region filter"
          className="rounded-[2px] border border-rule bg-paper px-2 py-0.5 font-data text-[12px]"
        >
          <option value="">every region</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label="theme filter"
          className="rounded-[2px] border border-rule bg-paper px-2 py-0.5 font-data text-[12px]"
        >
          <option value="">every theme</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 font-data text-[12px] text-ink-faded">
          magnitude ≥
          <select
            value={minMagnitude}
            onChange={(e) => setMinMagnitude(Number(e.target.value))}
            aria-label="minimum magnitude"
            className="rounded-[2px] border border-rule bg-paper px-1.5 py-0.5 font-data text-[12px]"
          >
            {[1, 2, 3, 4, 5].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {baseline.isLoading ? (
        <EmptyState title="Unrolling the record…" />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing in the record matches." />
      ) : (
        <ul className="mt-3 divide-y divide-rule/60">
          {filtered.map((anchor) => (
            <li key={anchor.id} className="flex items-baseline gap-3 py-2">
              <span className="w-[64px] shrink-0 text-right font-data text-[12.5px] text-record">
                {formatYear(anchor.year)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{anchor.title}</span>{' '}
                <span className="text-[14px] text-ink-faded">{anchor.summary}</span>
                <span className="mt-0.5 block font-data text-[11px] text-ink-faded">
                  {anchor.regions.join(' · ')} · {anchor.tags.join(', ')} · magnitude{' '}
                  {anchor.magnitude} · pull {anchor.attractorStrength.toFixed(2)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => flag(anchor)}
                className="shrink-0 font-data text-[11.5px] text-ink-faded hover:text-notice"
                title="copy a structured flag line for this anchor"
              >
                {flagged === anchor.id ? 'copied' : 'flag'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  )
}
