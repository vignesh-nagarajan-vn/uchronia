import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Lens, TimelineSummary } from '@uchronia/schemas'
import { LENSES } from '@uchronia/schemas'
import { useState } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { useNavigate } from 'react-router'
import { DialControl } from '../components/DialControl.js'
import { Shell, Wordmark } from '../components/Shell.js'
import { ApiError, api } from '../lib/api.js'
import { GALLERY, type GalleryEntry } from '../lib/gallery.js'

/** V1 — Atlas: the POD studio. Composer + curated catalogue + open ledgers. */
export function Atlas() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [podText, setPodText] = useState('')
  const [dial, setDial] = useState(50)
  const [horizon, setHorizon] = useState(150)
  const [lenses, setLenses] = useState<Lens[]>([...LENSES])
  const [burning, setBurning] = useState<TimelineSummary | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)
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
    onSuccess: () => {
      setBurning(null)
      void queryClient.invalidateQueries({ queryKey: ['timelines'] })
    },
  })

  const rename = useMutation({
    mutationFn: (args: { id: string; title: string }) =>
      api.updateTimeline(args.id, { title: args.title }),
    onSuccess: () => {
      setRenaming(null)
      void queryClient.invalidateQueries({ queryKey: ['timelines'] })
    },
  })

  // The showcase ledger ships with the app; loading it is one click. The JSON
  // chunk only downloads when asked for. A re-import finds the existing copy.
  const loadDemo = useMutation({
    mutationFn: async () => {
      const demo = (await import('../../../../demo/the-unburnt-library.uchronia.json')).default
      try {
        return await api.importAggregate(demo)
      } catch (error) {
        if (error instanceof ApiError && error.status === 409) {
          return { timelineId: (demo as { timeline: { id: string } }).timeline.id }
        }
        throw error
      }
    },
    onSuccess: async ({ timelineId }) => {
      setDemoError(null)
      await queryClient.invalidateQueries({ queryKey: ['timelines'] })
      const list = await api.listTimelines()
      const entry = list.find((t) => t.id === timelineId)
      if (entry) navigate(`/t/${timelineId}/b/${entry.rootBranchId}`)
    },
    onError: (error) =>
      setDemoError(error instanceof Error ? error.message : 'the demo failed to load'),
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
          <p className="mt-2 font-data text-[12px] text-thread" role="alert">
            The divergence could not be recorded: {(create.error as Error).message}
          </p>
        )}
      </section>

      {(timelines.data?.length ?? 0) === 0 && (
        <p className="mx-auto mt-6 max-w-[680px] text-center font-data text-[13px] text-ink-faded">
          first time here?{' '}
          <button
            type="button"
            onClick={() => loadDemo.mutate()}
            disabled={loadDemo.isPending}
            className="text-thread underline underline-offset-4 hover:no-underline disabled:opacity-50"
          >
            {loadDemo.isPending ? 'binding the showcase ledger…' : 'load the showcase chronicle'}
          </button>{' '}
          (67 events of an Alexandria that never burned)
        </p>
      )}
      {demoError && (
        <p
          className="mx-auto mt-2 max-w-[680px] text-center font-data text-[12px] text-thread"
          role="alert"
        >
          {demoError}
        </p>
      )}

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
                  onClick={() => {
                    if (t.rootBranchId) navigate(`/t/${t.id}/b/${t.rootBranchId}`)
                  }}
                >
                  <span className="text-[16px] font-medium">{t.title}</span>
                  <span className="ml-3 font-data text-[12px] text-ink-faded">
                    {t.eventCount} events · {t.branchCount}{' '}
                    {t.branchCount === 1 ? 'branch' : 'branches'} · dial {t.settings.dial} ·{' '}
                    {new Date(t.createdAt).toISOString().slice(0, 10)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setRenaming({ id: t.id, title: t.title })}
                  className="font-data text-[12px] text-ink-faded hover:text-ink"
                >
                  rename
                </button>
                <button
                  type="button"
                  onClick={() => setBurning(t)}
                  className="font-data text-[12px] text-ink-faded hover:text-thread"
                >
                  burn
                </button>
              </li>
            ))}
          </ul>
          {remove.isError && (
            <p className="mt-2 font-data text-[12px] text-thread" role="alert">
              The burn failed: {(remove.error as Error).message}
            </p>
          )}
        </section>
      )}

      {burning && (
        <ModalOverlay
          isOpen
          onOpenChange={(open) => {
            if (!open) setBurning(null)
          }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
        >
          <Modal className="w-full max-w-sm">
            <Dialog role="alertdialog" className="sheet p-5 outline-none">
              <Heading slot="title" className="text-[17px] font-semibold">
                Burn this ledger?
              </Heading>
              <p className="mt-2 text-[14.5px] text-ink-faded">
                “{burning.title}”: {burning.eventCount} events across {burning.branchCount}{' '}
                {burning.branchCount === 1 ? 'branch' : 'branches'}. Burning is permanent; export it
                first if you may want it back.
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <a
                  href={api.exportJsonUrl(burning.id)}
                  download
                  className="mr-auto self-center font-data text-[12px] text-ink-faded underline underline-offset-4 hover:text-ink"
                >
                  export first
                </a>
                <button
                  type="button"
                  onClick={() => setBurning(null)}
                  className="rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(burning.id)}
                  disabled={remove.isPending}
                  className="rounded-[2px] border border-thread px-3 py-1 text-[14px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
                >
                  {remove.isPending ? 'Burning…' : 'Burn it'}
                </button>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}

      {renaming && (
        <ModalOverlay
          isOpen
          onOpenChange={(open) => {
            if (!open) setRenaming(null)
          }}
          isDismissable
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
        >
          <Modal className="w-full max-w-sm">
            <Dialog className="sheet p-5 outline-none">
              <Heading slot="title" className="text-[17px] font-semibold">
                Rename the ledger
              </Heading>
              <input
                type="text"
                value={renaming.title}
                onChange={(e) => setRenaming({ ...renaming, title: e.target.value })}
                // biome-ignore lint/a11y/noAutofocus: focus belongs in the field this dialog exists for
                autoFocus
                className="mt-3 w-full rounded-[2px] border border-rule bg-paper px-3 py-1.5 text-[15px]"
              />
              {rename.isError && (
                <p className="mt-2 font-data text-[12px] text-thread" role="alert">
                  {(rename.error as Error).message}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRenaming(null)}
                  className="rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper"
                >
                  Leave it
                </button>
                <button
                  type="button"
                  onClick={() => rename.mutate(renaming)}
                  disabled={renaming.title.trim().length === 0 || rename.isPending}
                  className="rounded-[2px] border border-thread px-3 py-1 text-[14px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
                >
                  {rename.isPending ? 'Renaming…' : 'Rename'}
                </button>
              </div>
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </Shell>
  )
}
