import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lens } from '@uchronia/schemas'
import { LENSES } from '@uchronia/schemas'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { DialControl } from '../components/DialControl.js'
import { Shell, Wordmark } from '../components/Shell.js'
import { api } from '../lib/api.js'
import { GALLERY, type GalleryEntry } from '../lib/gallery.js'

/** V1 — Atlas: the POD studio. Composer + curated catalogue + open ledgers. */
export function Atlas() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [podText, setPodText] = useState('')
  const [dial, setDial] = useState(50)
  const [horizon, setHorizon] = useState(150)
  const [lenses, setLenses] = useState<Lens[]>([...LENSES])
  const timelines = useQuery({ queryKey: ['timelines'], queryFn: api.listTimelines })

  const create = useMutation({
    mutationFn: (args: { podText: string; dial: number; horizonYears: number; lenses: Lens[] }) =>
      api.createTimeline(args),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['timelines'] })
      navigate(`/t/${created.timeline.id}/b/${created.rootBranch.id}?derive=1`)
    },
  })

  const begin = (entry?: GalleryEntry) => {
    create.mutate({
      podText: entry?.podText ?? podText,
      dial: entry?.dial ?? dial,
      horizonYears: entry?.horizonYears ?? horizon,
      lenses: entry?.lenses ?? lenses,
    })
  }

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTimeline(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['timelines'] }),
  })

  return (
    <Shell>
      <section className="pt-14 pb-10 text-center">
        <Wordmark large />
        <p className="mt-2 font-data text-[13px] text-ink-faded">
          yoo-KROH-nee-uh · a chronicle of times that never were
        </p>
      </section>

      <section className="sheet mx-auto max-w-[680px] p-5" aria-label="compose a divergence">
        <label htmlFor="pod" className="font-data text-[13px] text-ink-faded">
          the point of divergence
        </label>
        <textarea
          id="pod"
          value={podText}
          onChange={(e) => setPodText(e.target.value)}
          rows={2}
          placeholder="What if the Library of Alexandria never burned?"
          className="mt-1 w-full resize-none rounded-[2px] border border-rule bg-paper px-3 py-2 text-[16px] placeholder:text-ink-faded/70 focus:outline-2 focus:outline-thread"
        />
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_140px]">
          <DialControl value={dial} onChange={setDial} />
          <div>
            <label htmlFor="horizon" className="font-data text-[13px] text-ink-faded">
              horizon (years)
            </label>
            <input
              id="horizon"
              type="number"
              min={10}
              max={3000}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value) || 150)}
              className="mt-2 w-full rounded-[2px] border border-rule bg-paper px-2 py-1 font-data text-[14px]"
            />
          </div>
        </div>
        <fieldset className="mt-4">
          <legend className="font-data text-[13px] text-ink-faded">lenses</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {LENSES.map((lens) => {
              const active = lenses.includes(lens)
              return (
                <button
                  key={lens}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    setLenses((prev) => (active ? prev.filter((l) => l !== lens) : [...prev, lens]))
                  }
                  className={`rounded-[2px] border px-2 py-0.5 font-data text-[12px] ${
                    active
                      ? 'border-ink-faded text-ink'
                      : 'border-rule text-ink-faded hover:text-ink'
                  }`}
                >
                  <span
                    className="mr-1.5 inline-block h-2.5 w-[3px] align-[-1px]"
                    style={{ background: `var(--color-lens-${lens})` }}
                  />
                  {lens}
                </button>
              )
            })}
          </div>
        </fieldset>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-data text-[12px] text-ink-faded">
            {create.isPending ? 'normalizing the divergence…' : 'a blank ledger awaits'}
          </p>
          <button
            type="button"
            disabled={podText.trim().length < 4 || create.isPending}
            onClick={() => begin()}
            className="rounded-[2px] border border-thread px-4 py-1.5 text-[15px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
          >
            Open a ledger
          </button>
        </div>
        {create.isError && (
          <p className="mt-2 font-data text-[12px] text-thread">
            The divergence could not be recorded: {(create.error as Error).message}
          </p>
        )}
      </section>

      <section className="mx-auto mt-14 max-w-[680px]" aria-label="the catalogue">
        <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
          or choose from the catalogue
        </h2>
        <ul className="divide-y divide-rule">
          {GALLERY.map((entry) => (
            <li key={entry.slug}>
              <button
                type="button"
                onClick={() => begin(entry)}
                disabled={create.isPending}
                className="group grid w-full grid-cols-[92px_1fr] gap-4 px-1 py-3 text-left hover:bg-paper-raised disabled:opacity-50"
              >
                <span className="pt-0.5 text-right font-data text-[13px] text-ink-faded">
                  {entry.yearLabel}
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold leading-snug group-hover:underline decoration-rule underline-offset-4">
                    {entry.title}
                  </span>
                  <span className="mt-0.5 block text-[14px] text-ink-faded">{entry.line}</span>
                  <span className="mt-0.5 block font-data text-[11.5px] text-ink-faded">
                    {entry.region} · {entry.mechanism} · dial {entry.dial}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {timelines.data && timelines.data.length > 0 && (
        <section className="mx-auto mt-14 max-w-[680px]" aria-label="open ledgers">
          <h2 className="border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            open ledgers
          </h2>
          <ul className="divide-y divide-rule">
            {timelines.data.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-1 py-2.5">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left hover:underline decoration-rule underline-offset-4"
                  onClick={async () => {
                    const aggregate = await api.exportAggregate(t.id)
                    const root = aggregate.branches.find((b) => b.parentBranchId === null)
                    if (root) navigate(`/t/${t.id}/b/${root.id}`)
                  }}
                >
                  <span className="text-[16px] font-medium">{t.title}</span>
                  <span className="ml-3 font-data text-[12px] text-ink-faded">
                    {t.eventCount} events · {t.branchCount}{' '}
                    {t.branchCount === 1 ? 'branch' : 'branches'} · dial {t.settings.dial}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Burn the ledger "${t.title}"? This cannot be undone.`)) {
                      remove.mutate(t.id)
                    }
                  }}
                  className="font-data text-[12px] text-ink-faded hover:text-thread"
                >
                  burn
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  )
}
