import { useQuery } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { api, type TraceSummary } from '../lib/api.js'
import { formatUsd } from '../lib/format.js'

/**
 * The Engine Room (v2/M15): every provider call behind a branch, inspectable.
 * Stage list on the left grouped by run; the drill-in shows the rendered
 * prompt and raw response with copy buttons, plus tokens, cost, retries, and
 * timing. This is the tool that makes every later quality improvement
 * iterable.
 */
export function EngineRoomView() {
  const { timelineId = '', branchId = '' } = useParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const list = useQuery({
    queryKey: ['traces', branchId],
    queryFn: () => api.traces(branchId),
  })
  const detail = useQuery({
    queryKey: ['trace', selectedId],
    queryFn: () => api.trace(selectedId ?? ''),
    enabled: selectedId !== null,
  })

  const groups = useMemo(() => {
    const traces = list.data?.traces ?? []
    const byRun = new Map<string, TraceSummary[]>()
    for (const trace of traces) {
      const key = trace.runId ?? 'one-off'
      byRun.set(key, [...(byRun.get(key) ?? []), trace])
    }
    // Newest run first; the one-off bucket last. Within a run, oldest first
    // (the order the pipeline made the calls).
    return [...byRun.entries()]
      .sort(([a], [b]) => (a === 'one-off' ? 1 : b === 'one-off' ? -1 : b.localeCompare(a)))
      .map(([runId, rows]) => ({ runId, rows: [...rows].reverse() }))
  }, [list.data])

  if (list.isError) {
    return (
      <Shell breadcrumb={<span className="text-ink">engine room</span>}>
        <ErrorState
          message={list.error instanceof Error ? list.error.message : 'traces failed'}
          retry={() => void list.refetch()}
        />
      </Shell>
    )
  }

  const totals = (list.data?.traces ?? []).reduce(
    (acc, t) => ({
      calls: acc.calls + 1,
      input: acc.input + t.inputTokens,
      output: acc.output + t.outputTokens,
      usd: acc.usd + t.estimatedUsd,
    }),
    { calls: 0, input: 0, output: 0, usd: 0 },
  )

  return (
    <Shell
      breadcrumb={
        <span>
          <Link to="/" className="hover:text-ink">
            atlas
          </Link>
          {' ▸ '}
          <Link to={`/t/${timelineId}/b/${branchId}`} className="hover:text-ink">
            the ledger
          </Link>
          {' ▸ '}
          <span className="text-ink">engine room</span>
        </span>
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule py-2">
        <h1 className="text-[19px] font-semibold">The engine room</h1>
        <p className="font-data text-[12px] text-ink-faded">
          {totals.calls} calls · {totals.input.toLocaleString()} in /{' '}
          {totals.output.toLocaleString()} out
          {totals.usd > 0 && ` · about ${formatUsd(totals.usd)}`}
          {list.data && ` · keeping ${list.data.retainedRuns} runs`}
        </p>
      </div>

      {list.data && !list.data.tracing && (
        <p className="mt-3 rounded-[2px] border border-notice/60 bg-notice-wash px-3 py-2 text-[14px]">
          Tracing is off (UCHRONIA_TRACE_RUNS=0); nothing new is being recorded.
        </p>
      )}

      {list.data && list.data.traces.length === 0 ? (
        <EmptyState title="No calls recorded yet.">
          <p>Derive or expand something on this branch and the calls will appear here.</p>
        </EmptyState>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-[380px_1fr]">
          <div className="max-h-[calc(100dvh-220px)] overflow-y-auto pr-1">
            {groups.map((group) => (
              <section key={group.runId} className="mb-4" aria-label={`run ${group.runId}`}>
                <h2 className="stamp border-b border-rule pb-1 text-ink-faded">
                  {group.runId === 'one-off'
                    ? 'one-off calls (intake, expanders, artifacts)'
                    : `run ${group.runId.slice(-8)}`}
                </h2>
                <ul>
                  {group.rows.map((trace) => (
                    <li key={trace.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(trace.id)}
                        className={clsx(
                          'w-full border-b border-rule/50 px-1 py-1.5 text-left hover:bg-paper-raised',
                          selectedId === trace.id && 'bg-paper-raised',
                        )}
                      >
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="font-data text-[12.5px]">
                            {trace.templateId}
                            <span className="text-ink-faded"> v{trace.templateVersion}</span>
                          </span>
                          <span
                            className={clsx('stamp', trace.ok ? 'text-ink-faded' : 'text-thread')}
                          >
                            {trace.ok
                              ? trace.attempts > 1
                                ? `${trace.attempts} tries`
                                : 'ok'
                              : 'failed'}
                          </span>
                        </span>
                        <span className="mt-0.5 block font-data text-[11px] text-ink-faded">
                          {trace.model || '(no reply)'} · {trace.inputTokens.toLocaleString()} in /{' '}
                          {trace.outputTokens.toLocaleString()} out
                          {trace.estimatedUsd > 0 && ` · ${formatUsd(trace.estimatedUsd)}`}
                          {trace.durationMs > 0 && ` · ${trace.durationMs}ms`}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="min-w-0">
            {selectedId === null ? (
              <p className="pt-8 text-center font-data text-[13px] text-ink-faded">
                choose a call to read its prompt and response
              </p>
            ) : detail.isLoading ? (
              <p className="pt-8 text-center font-data text-[13px] text-ink-faded">fetching…</p>
            ) : detail.data ? (
              <TracePanes trace={detail.data.trace} key={detail.data.trace.id} />
            ) : (
              <p className="pt-8 text-center font-data text-[13px] text-thread">
                the trace could not be fetched
              </p>
            )}
          </div>
        </div>
      )}
    </Shell>
  )
}

function TracePanes({
  trace,
}: {
  trace: {
    id: string
    templateId: string
    templateVersion: string
    role: string
    model: string
    system: string
    prompt: string
    response: string
    validationIssues: string[]
    error: string | null
    attempts: number
  }
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-data text-[14px]">
          {trace.templateId} v{trace.templateVersion}{' '}
          <span className="text-ink-faded">
            · {trace.role} · {trace.model || '(no reply)'}
          </span>
        </h2>
      </div>
      {trace.error && (
        <p className="rounded-[2px] border border-thread/60 bg-thread-wash px-3 py-2 font-data text-[12px] text-thread">
          {trace.error}
        </p>
      )}
      {trace.validationIssues.length > 0 && (
        <p className="font-data text-[12px] text-notice">
          validation issues on the final attempt: {trace.validationIssues.join('; ')}
        </p>
      )}
      <Pane title="system" text={trace.system} />
      <Pane
        title={trace.attempts > 1 ? `prompt (base; ${trace.attempts} attempts ran)` : 'prompt'}
        text={trace.prompt}
      />
      <Pane title="response (raw, last attempt)" text={trace.response} />
    </div>
  )
}

function Pane({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <section className="sheet p-3" aria-label={title}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="stamp text-ink-faded">{title}</h3>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(text).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1200)
            })
          }}
          className="font-data text-[11.5px] text-ink-faded hover:text-ink"
        >
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="mt-2 max-h-[320px] overflow-auto whitespace-pre-wrap break-words font-data text-[11.5px] leading-relaxed">
        {text || '(empty)'}
      </pre>
    </section>
  )
}
