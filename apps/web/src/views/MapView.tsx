import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { formatYear } from '../lib/format.js'
import { GRIP_OPACITY, holderTint, MAP_REGIONS, MAP_VIEWBOX } from '../lib/map-regions.js'
import { useBranchView } from './TimelineView.js'

/**
 * V10 - the map (v2/M22). Not a map: a diagram with the shape of one. Borders
 * are schematic and areas are not proportional, which the page says out loud,
 * because a stylized map that does not admit it is stylized is a lie with a
 * legend. A data table carries the same claims for anyone who cannot use the
 * picture, and it is not a fallback: it is always there.
 */
export function MapView() {
  const { timelineId = '', branchId = '' } = useParams()
  const view = useBranchView(branchId)
  const [cursor, setCursor] = useState<number | null>(null)
  const branchPath = `/t/${timelineId}/b/${branchId}`

  const controls = useMemo(
    () =>
      (view.data?.claims ?? [])
        .filter((c) => c.body.kind === 'region-control')
        .sort((a, b) => a.year - b.year),
    [view.data?.claims],
  )

  const years = useMemo(() => [...new Set(controls.map((c) => c.year))], [controls])
  const atYear = cursor ?? years.at(-1) ?? 0

  /** The map as of a year: the latest claim per region at or before it. */
  const held = useMemo(() => {
    const out = new Map<string, { holder: string; grip: string; note: string }>()
    for (const claim of controls) {
      if (claim.year > atYear) break
      if (claim.body.kind !== 'region-control') continue
      out.set(claim.body.region, {
        holder: claim.body.holder,
        grip: claim.body.grip,
        note: claim.body.note,
      })
    }
    return out
  }, [controls, atYear])

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
  const nameFor = (holder: string) => data.entities.find((e) => e.slug === holder)?.name ?? holder

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
          {' ▸ map'}
        </span>
      }
    >
      <div className="mx-auto max-w-[980px] pt-6">
        <h1 className="text-[22px] font-semibold">The map, such as it is</h1>
        <p className="mt-1 text-[14.5px] text-ink-faded">
          Eleven macro-regions, drawn schematically. The shapes are not borders and the areas are
          not to scale; this is a diagram for seeing which part of the world a history is talking
          about, and nothing here should be read as a frontier.
        </p>

        {controls.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="This history has not said who holds what.">
              <p className="text-[14.5px]">
                Region control is claimed by eras that actually move it. An uncoloured map is the
                honest picture of a chronicle that never mentioned the question.
              </p>
            </EmptyState>
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="era-scrub" className="font-data text-[12px] text-ink-faded">
                as of {formatYear(atYear)}
              </label>
              <input
                id="era-scrub"
                type="range"
                min={0}
                max={Math.max(0, years.length - 1)}
                value={Math.max(0, years.indexOf(atYear))}
                onChange={(e) => setCursor(years[Number(e.target.value)] ?? null)}
                className="min-w-[200px] flex-1 accent-[var(--color-thread)]"
                data-testid="map-scrubber"
              />
            </div>

            <svg
              viewBox={MAP_VIEWBOX}
              className="mt-3 w-full rounded-[2px] border border-rule bg-paper-raised"
              role="img"
              aria-label={`Control of eleven macro-regions as of ${formatYear(atYear)}. The table below carries the same claims.`}
              data-testid="map-svg"
            >
              <title>{`The stylized map as of ${formatYear(atYear)}`}</title>
              {MAP_REGIONS.map((region) => {
                const claim = held.get(region.name)
                return (
                  <g key={region.name}>
                    <polygon
                      points={region.points}
                      fill={claim ? holderTint(claim.holder) : 'transparent'}
                      fillOpacity={claim ? (GRIP_OPACITY[claim.grip] ?? 0.5) : 0}
                      stroke="var(--color-rule)"
                      strokeWidth={1.5}
                    />
                    <text
                      x={region.label[0]}
                      y={region.label[1]}
                      textAnchor="middle"
                      className="fill-[var(--color-ink-faded)] font-data"
                      fontSize={13}
                    >
                      {region.name}
                    </text>
                  </g>
                )
              })}
            </svg>

            <table className="mt-6 w-full text-left" data-testid="map-table">
              <caption className="pb-2 text-left font-data text-[12px] text-ink-faded">
                the same claims, as text
              </caption>
              <thead>
                <tr className="font-data text-[11.5px] text-ink-faded">
                  <th className="py-1 font-normal">region</th>
                  <th className="py-1 font-normal">held by</th>
                  <th className="py-1 font-normal">grip</th>
                  <th className="py-1 font-normal">as recorded</th>
                </tr>
              </thead>
              <tbody>
                {MAP_REGIONS.filter((r) => held.has(r.name)).map((region) => {
                  const claim = held.get(region.name)
                  if (!claim) return null
                  return (
                    <tr key={region.name} className="border-t border-rule/50 align-baseline">
                      <td className="py-1.5 pr-3 text-[14px]">{region.name}</td>
                      <td className="py-1.5 pr-3 text-[14px]">{nameFor(claim.holder)}</td>
                      <td className="py-1.5 pr-3 font-data text-[12.5px] text-ink-faded">
                        {claim.grip}
                      </td>
                      <td className="py-1.5 text-[14px] text-ink-faded">{claim.note}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </Shell>
  )
}
