import type { Branch } from '@uchronia/schemas'
import { scaleLinear } from 'd3'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { formatYear } from '../lib/format.js'
import { useBranchView } from './TimelineView.js'

interface BranchLine {
  branch: Branch
  forkYear: number
  lastYear: number
  x: number
}

/** V5 - Delta: the branch tree as one picture - red threads leaving the blue trunk. */
export function DeltaView() {
  const { timelineId = '', branchId = '' } = useParams()
  const view = useBranchView(branchId)
  const navigate = useNavigate()
  const [selected, setSelected] = useState<string[]>([])

  const layout = useMemo(() => {
    const data = view.data
    if (!data) return null
    const branches = data.branches
    const root = branches.find((b) => b.parentBranchId === null)
    if (!root) return null

    // Year extents per branch come from the aggregate we can reach: use the
    // fork years and the horizon; own last-event years are known only for the
    // viewed branch, so lines run fork→horizon (honest enough for a map).
    const podYear = data.pod.year
    const horizonEnd = podYear + data.timeline.settings.horizonYears

    // One pass for fork years - no per-branch scans over the event list.
    const eventYearById = new Map(data.events.map((e) => [e.id, e.date.year]))
    const forkYears = new Map(
      branches.map((b) => [
        b.id,
        b.forkEventId === null ? podYear : (eventYearById.get(b.forkEventId) ?? podYear),
      ]),
    )

    // Assign columns: trunk at 0; children ordered by fork year.
    const sorted = [...branches].sort(
      (a, b) => (forkYears.get(a.id) ?? podYear) - (forkYears.get(b.id) ?? podYear),
    )
    let column = 0
    const lines: BranchLine[] = sorted.map((branch) => {
      const x = branch.parentBranchId === null ? 0 : ++column
      return {
        branch,
        forkYear: forkYears.get(branch.id) ?? podYear,
        lastYear: horizonEnd,
        x,
      }
    })

    const width = 220 + column * 150
    const height = 480
    const y = scaleLinear()
      .domain([podYear, horizonEnd])
      .range([60, height - 30])
    const xPos = (line: BranchLine) => 80 + line.x * 150

    return { lines, width, height, y, xPos, podYear, horizonEnd, root }
  }, [view.data])

  if (view.isLoading)
    return (
      <Shell>
        <EmptyState title="Fetching the ledger…" />
      </Shell>
    )
  if (view.isError || !view.data || !layout)
    return (
      <Shell>
        <ErrorState
          message={(view.error as Error)?.message ?? 'unknown'}
          retry={() => view.refetch()}
        />
      </Shell>
    )

  const data = view.data
  const branchPath = `/t/${timelineId}/b/${branchId}`

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-1), id],
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
          <Link to={branchPath} className="hover:text-ink">
            {data.timeline.title}
          </Link>
          {' ▸ delta'}
        </span>
      }
      actions={
        selected.length === 2 ? (
          <Link
            to={`/t/${timelineId}/compare?a=${selected[0]}&b=${selected[1]}`}
            className="rounded-[2px] border border-thread px-2.5 py-0.5 font-data text-[12px] text-thread hover:bg-thread-wash"
          >
            compare the two
          </Link>
        ) : (
          <span className="font-data text-[12px] text-ink-faded">
            select two branches to compare
          </span>
        )
      }
    >
      <div className="pt-8">
        <h1 className="text-[22px] font-semibold">The delta</h1>
        <p className="mt-1 text-[14.5px] text-ink-faded">
          Every branch of this history. Click a line to read it; select two to compare.
        </p>

        <div className="mt-6 overflow-x-auto">
          <svg
            width={layout.width}
            height={layout.height}
            role="img"
            aria-label={`branch tree with ${layout.lines.length} branches`}
          >
            <title>the branch tree</title>
            {/* year rules */}
            {layout.y.ticks(6).map((year) => (
              <g key={year}>
                <line
                  x1={40}
                  x2={layout.width - 20}
                  y1={layout.y(year)}
                  y2={layout.y(year)}
                  stroke="var(--color-rule)"
                  strokeDasharray="2 4"
                />
                <text
                  x={4}
                  y={layout.y(year) + 4}
                  className="fill-[var(--color-ink-faded)]"
                  fontSize={11}
                  fontFamily="var(--font-mono)"
                >
                  {formatYear(year)}
                </text>
              </g>
            ))}
            {layout.lines.map((line) => {
              const x = layout.xPos(line)
              const isTrunk = line.branch.parentBranchId === null
              const parent = layout.lines.find((l) => l.branch.id === line.branch.parentBranchId)
              const yTop = layout.y(line.forkYear)
              const yBottom = layout.y(line.lastYear)
              const active = line.branch.id === branchId
              const isSelected = selected.includes(line.branch.id)
              return (
                <g key={line.branch.id}>
                  {parent && (
                    <path
                      d={`M ${layout.xPos(parent)} ${yTop} C ${layout.xPos(parent) + 40} ${yTop}, ${x - 40} ${yTop + 14}, ${x} ${yTop + 26}`}
                      fill="none"
                      stroke="var(--color-thread)"
                      strokeWidth={1.5}
                    />
                  )}
                  <line
                    x1={x}
                    x2={x}
                    y1={isTrunk ? layout.y(layout.podYear) : yTop + 26}
                    y2={yBottom}
                    stroke={isTrunk ? 'var(--color-record)' : 'var(--color-thread)'}
                    strokeWidth={active ? 3 : 2}
                    strokeOpacity={isTrunk ? 0.75 : 0.9}
                  />
                  {parent && (
                    <circle cx={layout.xPos(parent)} cy={yTop} r={3.5} fill="var(--color-thread)" />
                  )}
                  <foreignObject
                    x={x - 70}
                    y={(isTrunk ? layout.y(layout.podYear) : yTop + 26) - 46}
                    width={140}
                    height={44}
                  >
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => navigate(`/t/${timelineId}/b/${line.branch.id}`)}
                        className={`max-w-[140px] truncate text-[12.5px] leading-tight hover:underline underline-offset-2 ${active ? 'font-semibold' : ''}`}
                        title={line.branch.name}
                      >
                        {line.branch.name}
                      </button>
                      <br />
                      <label className="font-data text-[10.5px] text-ink-faded">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(line.branch.id)}
                          className="mr-1 h-3 w-3 accent-[var(--color-ink-faded)] align-middle"
                        />
                        compare
                      </label>
                    </div>
                  </foreignObject>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Accessible fallback list */}
        <section className="mt-8 max-w-[560px]" aria-label="branches as a list">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the branches, listed
          </h2>
          <ul className="divide-y divide-rule">
            {layout.lines.map((line) => (
              <li key={line.branch.id} className="flex items-baseline gap-3 py-2">
                <span className="w-[70px] shrink-0 text-right font-data text-[12.5px] text-ink-faded">
                  {formatYear(line.forkYear)}
                </span>
                <Link
                  to={`/t/${timelineId}/b/${line.branch.id}`}
                  className={`min-w-0 flex-1 truncate hover:underline underline-offset-4 ${line.branch.id === branchId ? 'font-semibold' : ''}`}
                >
                  {line.branch.name}
                </Link>
                {line.branch.subPod && (
                  <span className="stamp text-thread" title={line.branch.subPod.statement}>
                    sub-divergence
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Shell>
  )
}
