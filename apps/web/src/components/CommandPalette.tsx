import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../lib/api.js'
import { formatYear } from '../lib/format.js'

/**
 * The command palette (v2/M22). Ctrl+K, then type, from anywhere in the app.
 * It reads the branch out of the URL rather than taking it as a prop, so it
 * can be mounted once at the root and still work on an event, a dossier, or
 * an artifact. The index comes from the branch view already in the query
 * cache, so it costs no request and cannot go stale against the page.
 *
 * Scoring is deliberately simple and explainable: a prefix match beats a word
 * match beats a substring, and the kind breaks ties in reading order (eras,
 * then events, then people, then places). Fuzzy matching that surprises the
 * reader is worse than exact matching that does not.
 */

interface Entry {
  kind: 'era' | 'event' | 'entity' | 'branch' | 'page'
  label: string
  hint: string
  to: string
}

const KIND_ORDER: Record<Entry['kind'], number> = {
  page: 0,
  era: 1,
  event: 2,
  entity: 3,
  branch: 4,
}

function score(entry: Entry, query: string): number {
  const label = entry.label.toLowerCase()
  if (label === query) return 100
  if (label.startsWith(query)) return 80
  if (label.split(/\s+/).some((word) => word.startsWith(query))) return 60
  if (label.includes(query)) return 40
  if (entry.hint.toLowerCase().includes(query)) return 20
  return 0
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  // The palette follows the reader rather than the page component, so the
  // branch comes out of the path wherever they happen to be standing.
  const match = location.pathname.match(/^\/t\/([^/]+)\/b\/([^/]+)/)
  const timelineId = match?.[1] ?? ''
  const branchId = match?.[2] ?? ''
  const branchPath = `/t/${timelineId}/b/${branchId}`
  const view = useQuery({
    queryKey: ['branch-view', branchId],
    queryFn: () => api.branchView(branchId),
    enabled: open && branchId.length > 0,
  })
  const data = view.data

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((was) => !was)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [
      { kind: 'page', label: 'the atlas', hint: 'every chronicle', to: '/' },
      { kind: 'page', label: 'the record room', hint: 'the curated baseline', to: '/record' },
      { kind: 'page', label: 'settings', hint: 'mode, models, keys', to: '/settings' },
      ...(branchId
        ? ([
            { kind: 'page', label: 'the ledger', hint: 'this branch', to: branchPath },
            { kind: 'page', label: 'the map', hint: 'who holds what', to: `${branchPath}/map` },
            {
              kind: 'page',
              label: 'the engine room',
              hint: 'provider calls',
              to: `${branchPath}/engine`,
            },
            {
              kind: 'page',
              label: 'compare',
              hint: 'against another line',
              to: `${branchPath}/compare`,
            },
          ] as Entry[])
        : []),
    ]
    if (!data) return out
    for (const era of data.eras) {
      out.push({
        kind: 'era',
        label: era.title,
        hint: `${formatYear(era.startYear)}-${formatYear(era.endYear)}`,
        to: `${branchPath}?era=${era.id}`,
      })
    }
    for (const event of data.events) {
      out.push({
        kind: 'event',
        label: event.title,
        hint: event.date.label,
        to: `${branchPath}/e/${event.id}`,
      })
    }
    for (const entity of data.entities) {
      out.push({
        kind: 'entity',
        label: entity.name,
        hint: entity.type,
        to: `${branchPath}/entity/${entity.id}`,
      })
    }
    for (const branch of data.branches) {
      if (branch.id === branchId) continue
      out.push({
        kind: 'branch',
        label: branch.name,
        hint: 'branch',
        to: `/t/${timelineId}/b/${branch.id}`,
      })
    }
    return out
  }, [data, branchPath, branchId, timelineId])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length === 0) return entries.filter((e) => e.kind === 'page')
    return entries
      .map((entry) => ({ entry, s: score(entry, q) }))
      .filter((r) => r.s > 0)
      .sort(
        (a, b) =>
          b.s - a.s ||
          KIND_ORDER[a.entry.kind] - KIND_ORDER[b.entry.kind] ||
          a.entry.label.localeCompare(b.entry.label),
      )
      .slice(0, 12)
      .map((r) => r.entry)
  }, [entries, query])

  if (!open) return null

  const go = (entry: Entry | undefined) => {
    if (!entry) return
    setOpen(false)
    navigate(entry.to)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-ink/30 p-4 pt-[12vh]">
      {/* The scrim is a real button so it is reachable and announced, rather
          than a div that happens to handle clicks. */}
      <button
        type="button"
        aria-label="close the palette"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="command palette"
        className="sheet relative w-full max-w-[560px] p-3"
        data-testid="command-palette"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSelected(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setSelected((i) => Math.min(results.length - 1, i + 1))
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              setSelected((i) => Math.max(0, i - 1))
            }
            if (e.key === 'Enter') {
              e.preventDefault()
              go(results[selected])
            }
          }}
          placeholder="jump to an era, an event, a person, a branch…"
          aria-label="jump to"
          className="w-full rounded-[2px] border border-rule bg-paper px-3 py-2 text-[15px] placeholder:text-ink-faded/70 focus:outline-2 focus:outline-thread"
        />
        <ul className="mt-2 max-h-[50vh] overflow-y-auto">
          {results.length === 0 && (
            <li className="px-3 py-2 text-[14px] text-ink-faded">
              Nothing on this branch answers to that.
            </li>
          )}
          {results.map((entry, i) => (
            <li key={`${entry.kind}-${entry.to}-${entry.label}`}>
              <button
                type="button"
                onClick={() => go(entry)}
                onMouseEnter={() => setSelected(i)}
                aria-current={i === selected}
                className={`flex w-full items-baseline gap-3 rounded-[2px] px-3 py-1.5 text-left ${
                  i === selected ? 'bg-paper-raised' : ''
                }`}
              >
                <span className="font-data text-[11px] uppercase tracking-wide text-ink-faded">
                  {entry.kind}
                </span>
                <span className="min-w-0 flex-1 truncate text-[14.5px]">{entry.label}</span>
                <span className="shrink-0 font-data text-[11.5px] text-ink-faded">
                  {entry.hint}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
