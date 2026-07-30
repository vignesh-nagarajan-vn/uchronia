import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../lib/api.js'

/**
 * Ask the Archivist (v2/M23). A question is the reader's, not the
 * chronicle's, so nothing here is persisted: the exchange lives as long as
 * the drawer is open. A Grand Inquiry is different, and says so: it is a
 * finding, and it lands on the artifact shelf.
 *
 * Citation pins resolve in-app. An answer whose citations went nowhere would
 * be indistinguishable from one that made them up.
 */
export function AskDrawer({
  branchId,
  branchPath,
  onClose,
}: {
  branchId: string
  branchPath: string
  onClose: () => void
}) {
  const [question, setQuestion] = useState('')
  const navigate = useNavigate()

  const ask = useMutation({ mutationFn: () => api.ask(branchId, question.trim()) })
  const inquire = useMutation({
    mutationFn: () => api.inquiry(branchId, question.trim()),
    onSuccess: (artifact) => navigate(`${branchPath}/artifact/${artifact.id}`),
  })

  const answer = ask.data
  const linkFor = (kind: string, id: string) =>
    kind === 'event'
      ? `${branchPath}/e/${id}`
      : kind === 'artifact'
        ? `${branchPath}/artifact/${id}`
        : branchPath

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col border-l border-rule bg-paper shadow-xl"
      aria-label="ask the archivist"
      data-testid="ask-drawer"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-rule px-4 py-3">
        <h2 className="text-[16px] font-semibold">Ask the archivist</h2>
        <button
          type="button"
          onClick={onClose}
          className="font-data text-[12px] text-ink-faded hover:text-ink"
        >
          close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <p className="text-[13.5px] text-ink-faded">
          They have read all of this chronicle and nothing outside it. Every answer cites what it
          rests on, and “the record is silent” is a real answer.
        </p>

        {answer && (
          <div className="mt-4" data-testid="ask-answer">
            {answer.silent && <p className="stamp text-notice">the record is silent</p>}
            <p className="mt-1 text-[15px] leading-relaxed">{answer.answer}</p>
            {answer.citations.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-rule pt-2">
                {answer.citations.map((citation) => (
                  <li key={citation.pin} className="flex items-baseline gap-2">
                    <span className="font-data text-[11px] text-thread">[{citation.pin}]</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate(linkFor(citation.kind, citation.id))
                      }}
                      className="min-w-0 flex-1 truncate text-left text-[13.5px] text-ink-faded underline decoration-rule underline-offset-2 hover:text-ink"
                    >
                      {citation.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {(ask.isError || inquire.isError) && (
          <p className="mt-3 text-[14px] text-thread">
            {((ask.error ?? inquire.error) as Error)?.message ?? 'the archive did not answer'}
          </p>
        )}
      </div>

      <div className="border-t border-rule px-4 py-3">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={2}
          aria-label="your question"
          placeholder="what did the reform actually cost?"
          className="w-full resize-none rounded-[2px] border border-rule bg-paper px-2.5 py-1.5 text-[14.5px] placeholder:text-ink-faded/70 focus:outline-2 focus:outline-thread"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => ask.mutate()}
            disabled={ask.isPending || question.trim().length < 3}
            data-testid="ask-submit"
            className="rounded-[2px] border border-rule px-3 py-1 text-[14px] text-ink-faded hover:bg-paper-raised hover:text-ink disabled:opacity-40"
          >
            {ask.isPending ? 'asking…' : 'Ask'}
          </button>
          <button
            type="button"
            onClick={() => inquire.mutate()}
            disabled={inquire.isPending || question.trim().length < 8}
            title="A formal finding: verdict, cited chain, counter-considerations. Saved to the shelf."
            data-testid="inquiry-submit"
            className="rounded-[2px] border border-thread px-3 py-1 text-[14px] font-medium text-thread hover:bg-thread-wash disabled:opacity-40"
          >
            {inquire.isPending ? 'sitting…' : 'Put it to inquiry'}
          </button>
        </div>
      </div>
    </aside>
  )
}
