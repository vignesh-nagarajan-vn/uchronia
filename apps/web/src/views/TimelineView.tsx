import { useQuery } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { BaselineAnchor, BranchView, EntityView, EventView, Lens } from '@uchronia/schemas'
import { LENSES } from '@uchronia/schemas'
import { clsx } from 'clsx'
import { motion, useReducedMotion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { AskDrawer } from '../components/AskDrawer.js'
import { CommissionDialog } from '../components/CommissionDialog.js'
import { EraHeader } from '../components/EraHeader.js'
import { EventCard } from '../components/EventCard.js'
import { ForkDialog } from '../components/ForkDialog.js'
import { RecordTick } from '../components/RecordTick.js'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { ShortcutsDialog } from '../components/ShortcutsDialog.js'
import { type Thread, ThreadOverlay } from '../components/ThreadOverlay.js'
import { ApiError, api } from '../lib/api.js'
import { formatUsd } from '../lib/format.js'
import { useGeneration } from '../lib/generation.js'

type Row =
  | { kind: 'pod' }
  | { kind: 'era'; era: BranchView['eras'][number] }
  | { kind: 'event'; event: EventView; eventIndex: number }
  | { kind: 'record'; anchor: BaselineAnchor }

const RAIL_RECORD_X = 22
const RAIL_THREAD_X = 44

export function useBranchView(branchId: string) {
  return useQuery({
    queryKey: ['branch-view', branchId],
    queryFn: () => api.branchView(branchId),
  })
}

/** V2 - the Timeline: the core reading surface. */
export function TimelineView() {
  const { timelineId = '', branchId = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const view = useBranchView(branchId)
  const baseline = useQuery({
    queryKey: ['baseline'],
    queryFn: api.baseline,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const generation = useGeneration(branchId)
  const [lensSet, setLensSet] = useState<Set<Lens>>(new Set())
  const [search, setSearch] = useState('')
  const [showRecord, setShowRecord] = useState(true)
  const [focusedEventIndex, setFocusedEventIndex] = useState(0)
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)
  const [forkAt, setForkAt] = useState<EventView | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [commissioning, setCommissioning] = useState(false)
  const [asking, setAsking] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const reduced = useReducedMotion()

  // Leaving the page must not leave the SSE stream running into a dead view.
  const stopGeneration = generation.stop
  useEffect(() => () => stopGeneration(), [stopGeneration])

  // Auto-derive when arriving from the Atlas (?derive=1) onto an empty branch.
  const shouldDerive = searchParams.get('derive') === '1'
  const generationStatus = generation.state.status
  const startGeneration = generation.start
  useEffect(() => {
    if (shouldDerive && view.data && generationStatus === 'idle') {
      setSearchParams({}, { replace: true })
      void startGeneration()
    }
  }, [shouldDerive, view.data, generationStatus, startGeneration, setSearchParams])

  const data = view.data
  const branchPath = `/t/${timelineId}/b/${branchId}`

  const entitiesById = useMemo(
    () => new Map((data?.entities ?? []).map((e) => [e.id, e] as [string, EntityView])),
    [data?.entities],
  )
  const convergenceNotes = useMemo(
    () => new Map((data?.convergences ?? []).map((c) => [c.eventId, c.similarityNote])),
    [data?.convergences],
  )

  const filteredEvents = useMemo(() => {
    let events = data?.events ?? []
    if (lensSet.size > 0) {
      events = events.filter((e) => e.lenses.some((l) => lensSet.has(l)))
    }
    const query = search.trim().toLowerCase()
    if (query.length > 0) {
      events = events.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.summary.toLowerCase().includes(query) ||
          e.entityIds.some((id) => entitiesById.get(id)?.name.toLowerCase().includes(query)),
      )
    }
    return events
  }, [data?.events, lensSet, search, entitiesById])

  // Flatten eras/events (+ interleaved record anchors) into virtual rows.
  const rows = useMemo<Row[]>(() => {
    if (!data) return []
    const out: Row[] = [{ kind: 'pod' }]
    const byEra = new Map<string, EventView[]>()
    for (const event of filteredEvents) {
      byEra.set(event.eraId, [...(byEra.get(event.eraId) ?? []), event])
    }
    // The interleave below assumes year order; the dataset groups by region.
    const anchors = showRecord
      ? (baseline.data?.anchors ?? [])
          .filter(
            (a) =>
              a.year >= data.pod.year &&
              a.year <= data.pod.year + data.timeline.settings.horizonYears,
          )
          .sort((a, b) => a.year - b.year)
      : []
    let anchorIdx = 0
    let eventIndex = 0
    for (const era of data.eras) {
      out.push({ kind: 'era', era })
      for (const event of byEra.get(era.id) ?? []) {
        while (anchorIdx < anchors.length) {
          const anchor = anchors[anchorIdx]
          if (anchor && anchor.year <= event.date.year) {
            out.push({ kind: 'record', anchor })
            anchorIdx++
          } else break
        }
        out.push({ kind: 'event', event, eventIndex: eventIndex++ })
      }
    }
    while (anchorIdx < anchors.length) {
      const anchor = anchors[anchorIdx]
      if (anchor) out.push({ kind: 'record', anchor })
      anchorIdx++
    }
    return out
  }, [data, filteredEvents, baseline.data, showRecord])

  const eventRows = useMemo(
    () => rows.map((row, i) => ({ row, i })).filter((r) => r.row.kind === 'event'),
    [rows],
  )

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => {
      const row = rows[i]
      if (!row) return 60
      if (row.kind === 'pod') return 150
      if (row.kind === 'era') return 130
      if (row.kind === 'record') return 28
      return 96
    },
    overscan: 12,
  })

  // ---- red threads ---------------------------------------------------------
  const hovered = hoveredEventId ? data?.events.find((e) => e.id === hoveredEventId) : null
  const relatedIds = useMemo(() => {
    if (!hovered || !data) return null
    const ids = new Set<string>([hovered.id])
    for (const edge of data.edges) {
      if (edge.toEventId === hovered.id) ids.add(edge.fromEventId)
      if (edge.fromEventId === hovered.id) ids.add(edge.toEventId)
    }
    return ids
  }, [hovered, data])

  const [threads, setThreads] = useState<Thread[]>([])
  const [offscreen, setOffscreen] = useState<Map<string, [number, number]>>(new Map())
  // Recompute pins whenever the virtual window shifts under the hover.
  const virtualWindowSize = virtualizer.getVirtualItems().length
  // Layout effect (not post-paint) so the threads land the same frame as the
  // hover state, and one rect read per related card - the container rect is
  // hoisted out of the loop so scrolling while hovering doesn't thrash layout.
  // biome-ignore lint/correctness/useExhaustiveDependencies(virtualWindowSize): deliberately extra - thread pins must re-measure when virtualization swaps rows
  useLayoutEffect(() => {
    if (!relatedIds || !hovered || !scrollRef.current) {
      setThreads([])
      setOffscreen(new Map())
      return
    }
    const container = scrollRef.current
    const base = container.getBoundingClientRect()
    const scrollTop = container.scrollTop
    const pins = new Map<string, number>()
    for (const el of container.querySelectorAll<HTMLElement>('[data-event-id]')) {
      const id = el.dataset.eventId
      if (id && relatedIds.has(id)) {
        const rect = el.getBoundingClientRect()
        pins.set(id, rect.top - base.top + scrollTop + rect.height / 2)
      }
    }
    const originY = pins.get(hovered.id)
    if (originY === undefined) {
      setThreads([])
      return
    }
    const next: Thread[] = []
    let up = 0
    let down = 0
    const orderedIds = data?.events.map((e) => e.id) ?? []
    const originOrder = orderedIds.indexOf(hovered.id)
    for (const id of relatedIds) {
      if (id === hovered.id) continue
      const y = pins.get(id)
      if (y === undefined) {
        if (orderedIds.indexOf(id) < originOrder) up++
        else down++
        continue
      }
      next.push({
        key: `${hovered.id}-${id}`,
        from: { x: RAIL_THREAD_X + 14, y: originY },
        to: { x: RAIL_THREAD_X + 14, y },
      })
    }
    setThreads(next)
    setOffscreen(new Map([[hovered.id, [up, down]]]))
  }, [relatedIds, hovered, data, virtualWindowSize])

  // ---- keyboard (§8) -------------------------------------------------------
  // j/k moves REAL focus: the visual ring and the DOM focus are one thing, so
  // screen readers announce the walked event and `f`/`enter` act on what the
  // user last touched by any means.
  const scrollToEvent = useCallback(
    (index: number) => {
      const entry = eventRows[index]
      if (!entry || entry.row.kind !== 'event') return
      virtualizer.scrollToIndex(entry.i, { align: 'center' })
      const id = entry.row.event.id
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollRef.current
            ?.querySelector<HTMLElement>(`[data-event-id="${id}"] h3 a`)
            ?.focus({ preventScroll: true })
        })
      })
    },
    [eventRows, virtualizer],
  )
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey)
        return
      // Open dialogs own the keyboard; the ledger must not navigate under them.
      if (forkAt || shortcutsOpen) return
      const focusedEntry = eventRows[focusedEventIndex]
      switch (e.key) {
        case 'j':
          setFocusedEventIndex((i) => {
            const next = Math.min(eventRows.length - 1, i + 1)
            scrollToEvent(next)
            return next
          })
          break
        case 'k':
          setFocusedEventIndex((i) => {
            const next = Math.max(0, i - 1)
            scrollToEvent(next)
            return next
          })
          break
        case 'Enter':
          if (focusedEntry?.row.kind === 'event') {
            navigate(`${branchPath}/e/${focusedEntry.row.event.id}`)
          }
          break
        case 'f':
          if (focusedEntry?.row.kind === 'event') setForkAt(focusedEntry.row.event)
          break
        case 'l':
          setLensSet((prev) => {
            const order: Lens[] = [
              'political',
              'technological',
              'cultural',
              'economic',
              'daily-life',
            ]
            // Cycle: all → each single lens → all.
            const current = prev.size === 1 ? ([...prev][0] ?? null) : null
            const nextIndex = current === null ? 0 : order.indexOf(current) + 1
            return nextIndex >= order.length ? new Set() : new Set([order[nextIndex] as Lens])
          })
          break
        case '/':
          searchRef.current?.focus()
          break
        case 'b':
          navigate(`${branchPath}/delta`)
          break
        case 'c':
          navigate(`/t/${timelineId}/compare?a=${branchId}&b=baseline`)
          break
        case 'e': {
          // A download, not a navigation - assigning location.href would leave
          // the SPA whenever the response lacks a Content-Disposition header.
          const a = document.createElement('a')
          a.href = api.exportJsonUrl(timelineId)
          a.download = ''
          document.body.appendChild(a)
          a.click()
          a.remove()
          break
        }
        case '?':
          setShortcutsOpen(true)
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    eventRows,
    focusedEventIndex,
    scrollToEvent,
    navigate,
    branchPath,
    branchId,
    timelineId,
    forkAt,
    shortcutsOpen,
  ])

  if (view.isLoading) {
    return (
      <Shell>
        <EmptyState title="Fetching the ledger…" />
      </Shell>
    )
  }
  if (view.isError && view.error instanceof ApiError && view.error.status === 404) {
    // A dead end deserves the truth, not a retry button: the branch was
    // burned, never lived here, or sat on a serverless instance that has
    // since been recycled or redeployed (the playground is ephemeral).
    return (
      <Shell>
        <EmptyState title="This chronicle is no longer on the shelf.">
          <p>
            Either the branch was burned, or it lived on a playground instance that has since been
            recycled: on serverless hosting, histories are ephemeral and every redeploy resets the
            world to the showcase chronicle. What is gone cannot be refetched.
          </p>
          <Link to="/" className="mt-3 inline-block text-thread underline underline-offset-4">
            Return to the atlas and begin a new divergence
          </Link>
        </EmptyState>
      </Shell>
    )
  }
  if (view.isError || !data) {
    return (
      <Shell>
        <ErrorState
          message={(view.error as Error)?.message ?? 'unknown'}
          retry={() => view.refetch()}
        />
      </Shell>
    )
  }

  const running = generation.state.status === 'running'
  const empty = data.events.length === 0

  return (
    <Shell
      breadcrumb={
        <span>
          <Link to="/" className="hover:text-ink">
            atlas
          </Link>
          {' ▸ '}
          <span className="text-ink">{data.timeline.title}</span>
          {' ▸ '}
          <Link
            to={`${branchPath}/delta`}
            className="hover:text-ink"
            title="delta view - all branches"
          >
            {data.branch.name}
          </Link>
        </span>
      }
      actions={
        <div className="flex items-center gap-3 font-data text-[13px]">
          <Link to={`${branchPath}/delta`} className="text-ink-faded hover:text-ink">
            delta
          </Link>
          <Link
            to={`/t/${timelineId}/compare?a=${branchId}&b=baseline`}
            className="text-ink-faded hover:text-ink"
          >
            compare
          </Link>
          <Link
            to={`${branchPath}/engine`}
            className="text-ink-faded hover:text-ink"
            title="engine room - every provider call behind this branch"
          >
            engine
          </Link>
          <a
            href={api.exportJsonUrl(timelineId)}
            download
            className="text-ink-faded hover:text-ink"
          >
            export
          </a>
          <a
            href={`/api/branches/${branchId}/export.md`}
            download
            className="text-ink-faded hover:text-ink"
            title="this branch as markdown"
          >
            md
          </a>
          <a
            href={`/api/branches/${branchId}/export.html`}
            target="_blank"
            rel="noreferrer"
            className="text-ink-faded hover:text-ink"
            title="this branch as a self-contained page"
          >
            html
          </a>
          <Link to={`${branchPath}/map`} className="text-ink-faded hover:text-ink">
            map
          </Link>
          <button
            type="button"
            onClick={() => setAsking(true)}
            data-testid="ask-button"
            className="text-ink-faded hover:text-ink"
            title="ask this chronicle's archivist"
          >
            ask
          </button>
          <button
            type="button"
            onClick={() => setCommissioning(true)}
            data-testid="commission-button"
            className="text-ink-faded hover:text-ink"
            title="compile this branch into a book"
          >
            commission
          </button>
          <button
            type="button"
            onClick={() => setShortcutsOpen(true)}
            className="text-ink-faded hover:text-ink"
            aria-label="keyboard shortcuts"
          >
            ?
          </button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule py-2">
        <fieldset className="flex flex-wrap items-center gap-2">
          <legend className="sr-only">lens filter (multiple allowed)</legend>
          <button
            type="button"
            onClick={() => setLensSet(new Set())}
            aria-pressed={lensSet.size === 0}
            className={clsx(
              'rounded-[2px] border px-2 py-0.5 font-data text-[12px]',
              lensSet.size === 0 ? 'border-ink-faded text-ink' : 'border-rule text-ink-faded',
            )}
          >
            all lenses
          </button>
          {LENSES.map((lens) => (
            <button
              key={lens}
              type="button"
              onClick={() =>
                setLensSet((prev) => {
                  const next = new Set(prev)
                  if (next.has(lens)) next.delete(lens)
                  else next.add(lens)
                  return next
                })
              }
              aria-pressed={lensSet.has(lens)}
              className={clsx(
                'rounded-[2px] border px-2 py-0.5 font-data text-[12px]',
                lensSet.has(lens) ? 'border-ink-faded text-ink' : 'border-rule text-ink-faded',
              )}
            >
              <span
                className="mr-1.5 inline-block h-2.5 w-[3px] align-[-1px]"
                style={{ background: `var(--color-lens-${lens})` }}
              />
              {lens}
            </button>
          ))}
          <input
            ref={searchRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="search the ledger"
            aria-label="search events by title, summary, or entity"
            className="w-[190px] rounded-[2px] border border-rule bg-paper px-2 py-0.5 font-data text-[12px] placeholder:text-ink-faded/70"
          />
        </fieldset>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 font-data text-[12px] text-ink-faded">
            <input
              type="checkbox"
              checked={showRecord}
              onChange={(e) => setShowRecord(e.target.checked)}
              className="accent-[var(--color-record)]"
            />
            the record
          </label>
          {running ? (
            <span className="flex items-center gap-2">
              <span className="stamp text-thread" role="status">
                deriving{generation.state.currentEra ? `: ${generation.state.currentEra}` : '…'}
              </span>
              <button
                type="button"
                onClick={() => generation.stop()}
                className="rounded-[2px] border border-rule px-2.5 py-0.5 font-data text-[12px] text-ink-faded hover:text-ink"
              >
                Stop
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  void api
                    .updateTimeline(timelineId, {
                      horizonYears: data.timeline.settings.horizonYears + 100,
                    })
                    .then(() => view.refetch())
                }}
                className="rounded-[2px] border border-rule px-2.5 py-0.5 font-data text-[12px] text-ink-faded hover:text-ink"
                title="extend the horizon by a century; then continue the derivation"
              >
                +100y
              </button>
              <button
                type="button"
                onClick={() => void generation.start()}
                className="rounded-[2px] border border-thread px-2.5 py-0.5 font-data text-[12px] text-thread hover:bg-thread-wash"
              >
                {empty ? 'Derive history' : 'Continue derivation'}
              </button>
            </span>
          )}
        </div>
      </div>

      {/* What the sighted watch ink in, screen readers hear era by era. */}
      <p className="sr-only" aria-live="polite">
        {running
          ? `deriving ${generation.state.currentEra ?? ''}, ${generation.state.freshIds.size} events so far`
          : generation.state.freshIds.size > 0
            ? `derivation finished with ${generation.state.freshIds.size} new events`
            : ''}
      </p>

      {generation.state.error && (
        <p className="mt-2 font-data text-[12px] text-thread" role="alert">
          the derivation halted: {generation.state.error}
        </p>
      )}
      {generation.state.usage && (
        <p className="mt-2 font-data text-[12px] text-ink-faded" data-testid="cost-meter">
          {running ? 'spending' : 'the run spent'}{' '}
          {generation.state.usage.inputTokens.toLocaleString()} tokens in,{' '}
          {generation.state.usage.outputTokens.toLocaleString()} out
          {generation.state.usage.cacheReadTokens > 0 &&
            `, ${generation.state.usage.cacheReadTokens.toLocaleString()} cache-read`}
          {generation.state.usage.estimatedUsd > 0 &&
            ` · about ${formatUsd(generation.state.usage.estimatedUsd)}`}
          {generation.state.usage.unpricedModels.length > 0 && ' (plus unpriced model tokens)'}
        </p>
      )}

      {empty && !running ? (
        <EmptyState title="A blank ledger.">
          <p>
            The divergence is recorded: <em>{data.pod.statement}</em>
          </p>
          <p className="mt-2">Derive history to begin the chronicle.</p>
        </EmptyState>
      ) : (
        <div
          ref={scrollRef}
          className="relative h-[calc(100dvh-190px)] overflow-y-auto max-sm:h-[calc(100dvh-230px)]"
          data-testid="timeline-scroll"
        >
          <div className="relative" style={{ height: virtualizer.getTotalSize() }}>
            {/* The rails: record blue the whole way; thread red from the POD down. */}
            <div
              className="absolute top-0 w-[2px] bg-record/70"
              style={{ left: RAIL_RECORD_X, height: virtualizer.getTotalSize() }}
              aria-hidden="true"
            />
            <div
              className="absolute w-[2px] bg-thread"
              style={{
                left: RAIL_THREAD_X,
                top: 110,
                height: Math.max(0, virtualizer.getTotalSize() - 110),
              }}
              aria-hidden="true"
            />
            <ThreadOverlay threads={threads} height={virtualizer.getTotalSize()} />
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index]
              if (!row) return null
              return (
                <div
                  key={virtualRow.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="absolute left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="pl-[64px]">
                    {row.kind === 'pod' && <PodHeader pod={data.pod} />}
                    {row.kind === 'era' && <EraHeader era={row.era} />}
                    {row.kind === 'record' && (
                      <div style={{ marginLeft: -64 + RAIL_RECORD_X + 8 }}>
                        <RecordTick anchor={row.anchor} />
                      </div>
                    )}
                    {row.kind === 'event' && (
                      <InkIn
                        fresh={generation.state.freshIds.has(row.event.id)}
                        reduced={!!reduced}
                      >
                        <EventCard
                          event={row.event}
                          entities={entitiesById}
                          branchPath={branchPath}
                          focused={eventRows[focusedEventIndex]?.i === virtualRow.index}
                          dimmed={relatedIds !== null && !relatedIds.has(row.event.id)}
                          offscreenRelations={offscreen.get(row.event.id)}
                          onHoverChange={(h) => setHoveredEventId(h ? row.event.id : null)}
                          convergenceNote={convergenceNotes.get(row.event.id)}
                        />
                      </InkIn>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {forkAt && (
        <ForkDialog
          event={forkAt}
          branchId={branchId}
          timelineId={timelineId}
          onClose={() => setForkAt(null)}
        />
      )}
      {asking && (
        <AskDrawer branchId={branchId} branchPath={branchPath} onClose={() => setAsking(false)} />
      )}
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {commissioning && (
        <CommissionDialog
          branchId={branchId}
          title={data.timeline.title}
          onClose={() => setCommissioning(false)}
        />
      )}
    </Shell>
  )
}

/** The hero moment: the record splits, the thread peels away (§7.3). */
function PodHeader({ pod }: { pod: BranchView['pod'] }) {
  return (
    <div className="relative pt-4" style={{ marginLeft: -64 }}>
      <svg width="120" height="110" className="absolute left-0 top-0" aria-hidden="true">
        <title>the divergence</title>
        <line
          x1={RAIL_RECORD_X + 1}
          y1="0"
          x2={RAIL_RECORD_X + 1}
          y2="110"
          stroke="var(--color-record)"
          strokeWidth="2"
          strokeOpacity="0.7"
        />
        <path
          d={`M ${RAIL_RECORD_X + 1} 40 C ${RAIL_RECORD_X + 1} 70, ${RAIL_THREAD_X + 1} 75, ${RAIL_THREAD_X + 1} 110`}
          fill="none"
          stroke="var(--color-thread)"
          strokeWidth="2"
        />
        <circle cx={RAIL_RECORD_X + 1} cy="40" r="4" fill="var(--color-thread)" />
      </svg>
      <div className="pl-[64px] pb-2">
        <p className="stamp text-thread">the divergence · {pod.dateLabel}</p>
        <h1 className="mt-1 max-w-[640px] text-[22px] font-semibold leading-snug">
          {pod.statement}
        </h1>
        <p className="mt-1 max-w-[640px] text-[14px] text-ink-faded">
          <span className="font-data text-[12px] text-record">the record: </span>
          {pod.baselineContext}
        </p>
      </div>
    </div>
  )
}

function InkIn({
  fresh,
  reduced,
  children,
}: {
  fresh: boolean
  reduced: boolean
  children: React.ReactNode
}) {
  if (!fresh || reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(2px)' }}
      animate={{ opacity: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
