import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ConfirmedInterpretation,
  DialAxes,
  Lens,
  PodCandidate,
  PodInterpretedOut,
  TimelineSummary,
} from '@uchronia/schemas'
import { LENSES, MECHANISMS } from '@uchronia/schemas'
import { useState } from 'react'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Link, useNavigate } from 'react-router'
import { DialControl } from '../components/DialControl.js'
import { Shell, Wordmark } from '../components/Shell.js'
import { ApiError, api } from '../lib/api.js'
import { GALLERY, type GalleryEntry } from '../lib/gallery.js'

/** V1 - Atlas: the POD studio. Composer + curated catalogue + open ledgers. */
export function Atlas() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [podText, setPodText] = useState('')
  const [dial, setDial] = useState(50)
  const [axes, setAxes] = useState<DialAxes | null>(null)
  const [derivation, setDerivation] = useState<'standard' | 'symposium'>('standard')
  const [court, setCourt] = useState(false)
  const [epilogue, setEpilogue] = useState(false)
  const [horizon, setHorizon] = useState(150)
  const [lenses, setLenses] = useState<Lens[]>([...LENSES])
  const [burning, setBurning] = useState<TimelineSummary | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const [demoError, setDemoError] = useState<string | null>(null)
  // Intake 2.0 (v2/M14): the interpretation card between typing and deriving.
  // card is null when the reading came from curated gallery hints (M16):
  // there is nothing model-read to show chips or confidence for.
  const [reading, setReading] = useState<{
    card: PodInterpretedOut | null
    edit: ConfirmedInterpretation
  } | null>(null)
  const timelines = useQuery({ queryKey: ['timelines'], queryFn: api.listTimelines })
  const config = useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: 60_000 })

  const create = useMutation({
    mutationFn: (args: {
      podText: string
      dial: number
      axes?: DialAxes
      derivation?: 'standard' | 'symposium'
      court?: boolean
      epilogue?: boolean
      horizonYears: number
      lenses: Lens[]
      interpretation?: ConfirmedInterpretation
    }) => api.createTimeline(args),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['timelines'] })
      navigate(`/t/${created.timeline.id}/b/${created.rootBranch.id}?derive=1`)
    },
  })

  const interpret = useMutation({
    mutationFn: (text: string) => api.interpret(text),
    onSuccess: ({ interpretation }) => {
      setReading({
        card: interpretation,
        edit: {
          statement: interpretation.statement,
          year: interpretation.year,
          dateLabel: interpretation.dateLabel,
          region: interpretation.region,
          mechanism: interpretation.mechanism,
          baselineContext: interpretation.baselineContext,
          suggestedTitle: interpretation.suggestedTitle,
        },
      })
    },
  })

  const applyCandidate = (candidate: PodCandidate) => {
    setReading((r) =>
      r
        ? {
            ...r,
            edit: {
              ...r.edit,
              statement: /[.!]$/.test(candidate.label) ? candidate.label : `${candidate.label}.`,
              year: candidate.year,
              dateLabel: candidate.dateLabel,
              region: candidate.region,
              mechanism: candidate.mechanism,
            },
          }
        : r,
    )
  }

  const begin = () => {
    create.mutate({
      podText,
      dial,
      ...(axes ? { axes } : {}),
      derivation,
      court,
      epilogue,
      horizonYears: horizon,
      lenses,
      ...(reading ? { interpretation: reading.edit } : {}),
    })
  }

  // Gallery hints (v2/M16): one click composes the divergence with the card
  // prefilled from curated hints - no API call, nothing created yet.
  const compose = (entry: GalleryEntry) => {
    setPodText(entry.podText)
    setDial(entry.dial)
    setHorizon(entry.horizonYears)
    if (entry.lenses) setLenses(entry.lenses)
    setReading({
      card: null,
      edit: {
        statement: entry.hint.statement,
        year: entry.hint.year,
        dateLabel: entry.hint.dateLabel,
        region: entry.region,
        mechanism: entry.mechanism,
        baselineContext: entry.hint.baselineContext,
        suggestedTitle: entry.title,
      },
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      <section className="pt-12 pb-10 text-center">
        <img
          src="/uchronia-logo.png"
          alt=""
          width={132}
          height={127}
          className="mx-auto mb-4 h-[127px] w-[132px] dark:brightness-[1.45]"
        />
        <Wordmark large />
        <p className="mt-2 font-data text-[13px] text-ink-faded">
          yoo-KROH-nee-uh · a chronicle of times that never were
        </p>
      </section>

      <section className="sheet mx-auto max-w-[680px] p-5" aria-label="compose a divergence">
        {config.data?.mode === 'demo' && (
          <div
            role="status"
            data-testid="demo-banner"
            className="mb-4 rounded-[2px] border border-notice/60 bg-notice-wash px-3 py-2.5"
          >
            <p className="stamp font-medium tracking-[0.08em] text-notice">DEMO MODE</p>
            <p className="mt-1 text-[14px] leading-snug">
              This engine is running canned, deterministic demo content. What you type shapes the
              frame (the year, the region, the naming), never the history itself. For real
              derivation, add an API key on the server:{' '}
              <Link to="/settings" className="text-notice underline underline-offset-4">
                how to go live
              </Link>
              .
            </p>
          </div>
        )}
        <label htmlFor="pod" className="font-data text-[13px] text-ink-faded">
          the point of divergence
        </label>
        <textarea
          id="pod"
          value={podText}
          onChange={(e) => {
            setPodText(e.target.value)
            setReading(null) // a changed ask invalidates the old reading
          }}
          rows={2}
          placeholder="What if the Library of Alexandria never burned?"
          className="mt-1 w-full resize-none rounded-[2px] border border-rule bg-paper px-3 py-2 text-[16px] placeholder:text-ink-faded/70 focus:outline-2 focus:outline-thread"
        />
        <div className="mt-4 grid gap-5 sm:grid-cols-[1fr_140px]">
          <DialControl value={dial} onChange={setDial} axes={axes} onAxesChange={setAxes} />
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
        {/* Derivation mode (v2/M17). Both options cost real tokens in live mode,
            so the price is on the label rather than buried in a tooltip. */}
        <fieldset className="mt-4" data-testid="derivation-controls">
          <legend className="font-data text-[13px] text-ink-faded">derivation</legend>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {(
              [
                ['standard', 'standard', 'one historian, one pass'],
                ['symposium', 'symposium', 'three chairs and a synthesis, roughly 4x the tokens'],
              ] as const
            ).map(([mode, label, gloss]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={derivation === mode}
                onClick={() => setDerivation(mode)}
                title={gloss}
                className={`rounded-[2px] border px-2 py-0.5 font-data text-[12px] ${
                  derivation === mode
                    ? 'border-ink-faded text-ink'
                    : 'border-rule text-ink-faded hover:text-ink'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={court}
              onClick={() => setCourt((c) => !c)}
              title="Disputed events get an advocate, a skeptic, and a ruling, at most three per era"
              data-testid="court-toggle"
              className={`rounded-[2px] border px-2 py-0.5 font-data text-[12px] ${
                court ? 'border-ink-faded text-ink' : 'border-rule text-ink-faded hover:text-ink'
              }`}
            >
              court of plausibility
            </button>
            <button
              type="button"
              aria-pressed={epilogue}
              onClick={() => setEpilogue((e) => !e)}
              title="One era past the horizon, marked as a projection rather than a derivation"
              data-testid="epilogue-toggle"
              className={`rounded-[2px] border px-2 py-0.5 font-data text-[12px] ${
                epilogue ? 'border-ink-faded text-ink' : 'border-rule text-ink-faded hover:text-ink'
              }`}
            >
              epilogue
            </button>
          </div>
          <p className="mt-1.5 font-data text-[11.5px] leading-snug text-ink-faded">
            {derivation === 'symposium'
              ? 'Three specialist historians draft each era and a fourth pass merges them, keeping what they could not settle as contested marks.'
              : 'One historian drafts each era. The critic still reviews every event.'}
            {court ? ' Disputed events are argued out before the ledger closes.' : ''}
            {epilogue ? ' One era past the horizon is added as an openly marked projection.' : ''}
          </p>
        </fieldset>
        {reading && (
          <div
            className="mt-4 rounded-[2px] border border-rule bg-paper p-4"
            data-testid="interpretation-card"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="stamp text-thread">the reading</p>
              <p className="font-data text-[11.5px] text-ink-faded">
                {reading.card
                  ? `confidence ${(reading.card.confidence * 100).toFixed(0)}%`
                  : 'from the catalogue'}
              </p>
            </div>
            {reading.card?.clarifyingQuestion && (
              <p className="mt-2 text-[14px] font-medium text-notice">
                {reading.card.clarifyingQuestion.question}
              </p>
            )}
            {reading.card && reading.card.ambiguities.length > 0 && (
              <p className="mt-1 font-data text-[11.5px] text-ink-faded">
                open questions: {reading.card.ambiguities.join('; ')}
              </p>
            )}
            {reading.card && reading.card.candidates.length > 1 && (
              <fieldset className="mt-3">
                <legend className="font-data text-[12px] text-ink-faded">
                  ways this divergence could happen (pick one, or edit below)
                </legend>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {reading.card.candidates.map((candidate) => {
                    const active =
                      reading.edit.year === candidate.year &&
                      reading.edit.statement.startsWith(candidate.label)
                    return (
                      <button
                        key={candidate.label}
                        type="button"
                        onClick={() => applyCandidate(candidate)}
                        aria-pressed={active}
                        title={candidate.rationale}
                        className={`rounded-[2px] border px-2 py-1 text-left font-data text-[12px] ${
                          active
                            ? 'border-thread text-thread'
                            : 'border-rule text-ink-faded hover:text-ink'
                        }`}
                      >
                        {candidate.label} · {candidate.dateLabel}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )}
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_110px]">
              <label className="block">
                <span className="font-data text-[12px] text-ink-faded">statement</span>
                <textarea
                  aria-label="statement"
                  value={reading.edit.statement}
                  onChange={(e) =>
                    setReading((r) =>
                      r ? { ...r, edit: { ...r.edit, statement: e.target.value } } : r,
                    )
                  }
                  rows={2}
                  className="mt-1 w-full resize-none rounded-[2px] border border-rule bg-paper-raised px-2 py-1 text-[14px]"
                />
              </label>
              <label className="block">
                <span className="font-data text-[12px] text-ink-faded">year</span>
                <input
                  aria-label="year"
                  type="number"
                  value={reading.edit.year}
                  onChange={(e) =>
                    setReading((r) =>
                      r
                        ? {
                            ...r,
                            edit: {
                              ...r.edit,
                              year: Number(e.target.value) || r.edit.year,
                              dateLabel: String(Number(e.target.value) || r.edit.year),
                            },
                          }
                        : r,
                    )
                  }
                  className="mt-1 w-full rounded-[2px] border border-rule bg-paper-raised px-2 py-1 font-data text-[13px]"
                />
              </label>
            </div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="font-data text-[12px] text-ink-faded">region</span>
                <input
                  aria-label="region"
                  type="text"
                  value={reading.edit.region}
                  onChange={(e) =>
                    setReading((r) =>
                      r ? { ...r, edit: { ...r.edit, region: e.target.value } } : r,
                    )
                  }
                  className="mt-1 w-full rounded-[2px] border border-rule bg-paper-raised px-2 py-1 text-[13px]"
                />
              </label>
              <label className="block">
                <span className="font-data text-[12px] text-ink-faded">mechanism</span>
                <select
                  aria-label="mechanism"
                  value={reading.edit.mechanism}
                  onChange={(e) =>
                    setReading((r) =>
                      r
                        ? {
                            ...r,
                            edit: {
                              ...r.edit,
                              mechanism: e.target.value as ConfirmedInterpretation['mechanism'],
                            },
                          }
                        : r,
                    )
                  }
                  className="mt-1 w-full rounded-[2px] border border-rule bg-paper-raised px-2 py-1 text-[13px]"
                >
                  {MECHANISMS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-[13px] text-ink-faded">
              <span className="font-data text-[11.5px] text-record">the record: </span>
              {reading.edit.baselineContext}
            </p>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReading(null)}
                className="rounded-[2px] border border-rule px-3 py-1 text-[14px] hover:bg-paper-raised"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={create.isPending || reading.edit.statement.trim().length === 0}
                onClick={() => begin()}
                className="rounded-[2px] border border-thread px-4 py-1.5 text-[15px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
              >
                {create.isPending ? 'Opening…' : 'Open the ledger'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="min-w-0 font-data text-[12px] text-ink-faded">
            {interpret.isPending
              ? 'reading the divergence…'
              : create.isPending
                ? 'opening the ledger…'
                : reading
                  ? 'confirm the reading above, or edit it first'
                  : 'a blank ledger awaits'}
          </p>
          {!reading && (
            <span className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                disabled={podText.trim().length < 4 || create.isPending || interpret.isPending}
                onClick={() => begin()}
                className="rounded-[2px] border border-rule px-3 py-1.5 text-[14px] text-ink-faded hover:text-ink disabled:opacity-40"
                title="skip the interpretation card and derive from the top reading"
              >
                Just derive
              </button>
              <button
                type="button"
                disabled={podText.trim().length < 4 || interpret.isPending || create.isPending}
                onClick={() => interpret.mutate(podText)}
                className="rounded-[2px] border border-thread px-4 py-1.5 text-[15px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
              >
                Read the divergence
              </button>
            </span>
          )}
        </div>
        {interpret.isError && (
          <p className="mt-2 font-data text-[12px] text-thread" role="alert">
            The reading failed: {(interpret.error as Error).message}
          </p>
        )}
        {create.isError && (
          <p className="mt-2 font-data text-[12px] text-thread" role="alert">
            The divergence could not be recorded: {(create.error as Error).message}
          </p>
        )}
      </section>

      {timelines.isSuccess && timelines.data.length === 0 && (
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
                onClick={() => compose(entry)}
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
