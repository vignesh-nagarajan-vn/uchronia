import type { Artifact } from '@uchronia/schemas'
import { Link, useParams } from 'react-router'
import { EmptyState, ErrorState, Shell } from '../components/Shell.js'
import { useBranchView } from './TimelineView.js'

/** V7 - the artifact reader: full-bleed diegetic rendering, one template per kind. */
export function ArtifactReader() {
  const { timelineId = '', branchId = '', artifactId = '' } = useParams()
  const view = useBranchView(branchId)
  const branchPath = `/t/${timelineId}/b/${branchId}`

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
  const artifact = data.artifacts.find((a) => a.id === artifactId)
  if (!artifact) {
    return (
      <Shell>
        <EmptyState title="The shelf does not hold that document.">
          <Link to={branchPath} className="underline underline-offset-4">
            Back to the timeline
          </Link>
        </EmptyState>
      </Shell>
    )
  }
  const event = data.events.find((e) => e.id === artifact.eventId)

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
          {' ▸ '}
          {event ? (
            <Link to={`${branchPath}/e/${event.id}`} className="hover:text-ink">
              {event.date.label}
            </Link>
          ) : (
            'artifact'
          )}
          {' ▸ '}
          <span className="text-ink">{artifact.kind}</span>
        </span>
      }
    >
      <p className="mx-auto max-w-[760px] pt-6 text-center font-data text-[12px] text-ink-faded">
        {artifact.kind === 'inquiry'
          ? 'a finding about this timeline, made from its own record - speculative fiction, not a source'
          : `a ${artifact.kind} produced from inside this timeline - speculative fiction, not a source`}
      </p>
      <div className="mx-auto mt-4 max-w-[760px]">
        <ArtifactBody artifact={artifact} />
      </div>
    </Shell>
  )
}

export function ArtifactBody({ artifact }: { artifact: Artifact }) {
  const body = artifact.body
  switch (body.kind) {
    case 'newspaper':
      return (
        <div className="sheet px-8 py-8 sm:px-12">
          <h1 className="border-b-2 border-ink pb-3 text-center font-fell text-[38px] leading-tight">
            {body.masthead}
          </h1>
          <p className="border-b border-ink/60 py-1.5 text-center font-data text-[12px] text-ink-faded">
            {body.dateline}
          </p>
          <h2 className="mt-6 text-center font-fell text-[30px] leading-tight">{body.headline}</h2>
          {body.subhead && (
            <p className="mt-1 text-center text-[15px] italic text-ink-faded">{body.subhead}</p>
          )}
          <div
            className="mt-6 gap-8 sm:columns-2"
            style={{ columnRule: '1px solid var(--color-rule)' }}
          >
            {body.columns.map((column, columnIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
              <section key={`column-${columnIndex}`} className="break-inside-avoid">
                {column.heading && (
                  <h3 className="mt-2 text-[15px] font-semibold uppercase tracking-wide">
                    {column.heading}
                  </h3>
                )}
                {column.paragraphs.map((para, paraIndex) => (
                  <p
                    // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
                    key={`para-${paraIndex}`}
                    className="mt-2 text-justify text-[14.5px] leading-[1.55]"
                  >
                    {para}
                  </p>
                ))}
              </section>
            ))}
          </div>
          {body.notices.length > 0 && (
            <div className="mt-8 border-t-2 border-ink/60 pt-3">
              <p className="text-center font-data text-[11px] uppercase tracking-[0.2em] text-ink-faded">
                notices
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {body.notices.map((notice, noticeIndex) => (
                  <p
                    // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
                    key={`notice-${noticeIndex}`}
                    className="border border-rule px-2.5 py-2 text-[12.5px] italic leading-snug"
                  >
                    {notice}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    case 'letter':
      return (
        <div className="sheet px-10 py-10 sm:px-16">
          <p className="text-right font-data text-[13px] text-ink-faded">
            {body.place}, {body.dateLabel}
          </p>
          <p className="mt-8 text-[17px] italic">{body.salutation}</p>
          {body.paragraphs.map((para, paraIndex) => (
            <p
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
              key={`para-${paraIndex}`}
              className="mt-4 indent-8 text-[16.5px] italic leading-[1.75]"
            >
              {para}
            </p>
          ))}
          <p className="mt-8 text-right text-[16px] italic">{body.closing}</p>
          <p className="mt-1 text-right font-fell text-[24px]">{body.signature}</p>
          {body.postscript && (
            <p className="mt-6 border-t border-rule pt-3 text-[14px] italic text-ink-faded">
              {body.postscript}
            </p>
          )}
          <p className="mt-6 font-data text-[11px] text-ink-faded">
            {body.from} → {body.to}
          </p>
        </div>
      )
    case 'encyclopedia':
      return (
        <div className="sheet px-8 py-8 sm:px-12">
          <p className="border-b border-rule pb-2 text-center font-fell text-[24px]">
            {body.encyclopediaTitle}
          </p>
          <p className="pt-1 text-center font-data text-[11.5px] text-ink-faded">
            {body.editionNote}
          </p>
          <h1 className="mt-6 text-[18px] font-semibold uppercase tracking-wide">
            {body.headword}
          </h1>
          <div
            className="mt-2 gap-8 sm:columns-2"
            style={{ columnRule: '1px solid var(--color-rule)' }}
          >
            {body.entryParagraphs.map((para, paraIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
              <p key={`para-${paraIndex}`} className="mt-2 text-justify text-[14px] leading-[1.6]">
                {para}
              </p>
            ))}
          </div>
          {body.seeAlso.length > 0 && (
            <p className="mt-5 border-t border-rule pt-2 font-data text-[12px] text-ink-faded">
              see also: {body.seeAlso.join(' · ')}
            </p>
          )}
        </div>
      )
    case 'poster':
      return (
        <div
          className="sheet px-8 py-12 text-center sm:px-14"
          style={{ border: '3px double var(--color-ink)' }}
        >
          <h1 className="font-fell text-[42px] leading-[1.1]">{body.headline}</h1>
          {body.subheadline && (
            <p className="mt-3 text-[17px] italic text-ink-faded">{body.subheadline}</p>
          )}
          <div className="mx-auto mt-7 max-w-[480px] space-y-3">
            {body.lines.map((line, lineIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose list; duplicate content makes content-derived keys collide
              <p key={`line-${lineIndex}`} className="text-[16.5px] leading-snug">
                {line}
              </p>
            ))}
          </div>
          {body.slogan && <p className="mt-8 font-fell text-[24px] text-thread">{body.slogan}</p>}
          <p className="mt-7 border-t border-rule pt-3 font-data text-[12px] uppercase tracking-[0.15em] text-ink-faded">
            {body.issuer}
          </p>
        </div>
      )
    // A wire is a form that costs money per word, so it is set in the monospace
    // of a receiving printer, uppercase, with STOP where the sender paid for it.
    case 'telegram':
      return (
        <div className="sheet px-8 py-8 sm:px-12" style={{ border: '1px solid var(--color-ink)' }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2 font-data text-[11.5px] uppercase tracking-[0.12em]">
            <span>{body.office}</span>
            <span className="text-ink-faded">{body.filedAt}</span>
          </div>
          <dl className="mt-3 grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 font-data text-[12px]">
            <dt className="text-ink-faded">FROM</dt>
            <dd className="uppercase">{body.from}</dd>
            <dt className="text-ink-faded">TO</dt>
            <dd className="uppercase">{body.to}</dd>
          </dl>
          <p className="mt-6 font-data text-[15px] uppercase leading-[2]">
            {body.words.join(' STOP ')} STOP
          </p>
          {body.endorsement && (
            <p className="mt-8 border-t border-rule pt-3 text-[13.5px] italic text-ink-faded">
              {body.endorsement}
            </p>
          )}
        </div>
      )
    case 'radio':
      return (
        <div className="sheet px-8 py-8 sm:px-12">
          <p className="text-center font-fell text-[22px]">{body.station}</p>
          <p className="pt-1 text-center font-data text-[11.5px] text-ink-faded">
            {body.programme} · {body.airedAt}
          </p>
          <dl className="mt-6 space-y-3">
            {body.lines.map((line, lineIndex) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: a transcript repeats speakers by nature
                key={`line-${lineIndex}`}
                className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-4"
              >
                <dt className="font-data text-[11.5px] uppercase tracking-wide text-ink-faded">
                  {line.speaker}
                </dt>
                <dd className="text-[15.5px] leading-relaxed">{line.text}</dd>
              </div>
            ))}
          </dl>
          {body.annotations.length > 0 && (
            <div className="mt-7 border-t border-rule pt-3">
              <p className="stamp text-ink-faded">the monitor's notes</p>
              <ul className="mt-1 space-y-1">
                {body.annotations.map((note, noteIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static list
                  <li key={`note-${noteIndex}`} className="text-[13.5px] italic text-ink-faded">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    case 'obituary':
      return (
        <div className="sheet px-8 py-8 sm:px-12">
          <p className="border-b border-ink pb-1 text-center font-data text-[11.5px] uppercase tracking-[0.14em] text-ink-faded">
            {body.publication}
          </p>
          <h1 className="mt-6 font-fell text-[30px] leading-tight">{body.headline}</h1>
          <p className="mt-1 font-data text-[12.5px] text-ink-faded">
            {body.subject} · {body.lifespan}
          </p>
          <div className="mt-5 space-y-3">
            {body.paragraphs.map((para, paraIndex) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static prose list
              <p key={`para-${paraIndex}`} className="text-[15.5px] leading-[1.7]">
                {para}
              </p>
            ))}
          </div>
          {body.epitaph && (
            <p className="mt-7 border-t border-rule pt-3 text-center font-fell text-[20px]">
              {body.epitaph}
            </p>
          )}
        </div>
      )
    case 'classified':
      return (
        <div className="sheet px-8 py-8 sm:px-12">
          <p className="border-b border-ink pb-1 text-center font-data text-[11.5px] uppercase tracking-[0.14em] text-ink-faded">
            {body.publication} · notices · {body.dateLabel}
          </p>
          <div
            className="mt-5 gap-8 sm:columns-2"
            style={{ columnRule: '1px solid var(--color-rule)' }}
          >
            {body.sections.map((section) => (
              <section key={section.heading} className="mb-4 break-inside-avoid">
                <h2 className="font-data text-[11.5px] uppercase tracking-[0.12em] text-ink-faded">
                  {section.heading}
                </h2>
                <ul className="mt-1 space-y-2">
                  {section.notices.map((notice, noticeIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static list
                    <li key={`notice-${noticeIndex}`} className="text-[13.5px] leading-snug">
                      {notice}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      )
    // A finding, not a period source. It gets the app's own register (rules,
    // mono labels, a stated confidence) precisely so nobody reads it as one
    // of the documents on the shelf beside it.
    case 'inquiry':
      return (
        <div className="sheet px-8 py-8 sm:px-12" data-testid="inquiry-body">
          <p className="stamp text-thread">a finding, not a document</p>
          <h1 className="mt-2 text-[22px] font-semibold leading-tight">{body.thesis}</h1>
          <p className="mt-4 border-l-2 border-thread bg-thread-wash px-4 py-3 text-[16px]">
            {body.verdict}
          </p>
          <p className="mt-1 font-data text-[11.5px] text-ink-faded">
            confidence in the record, not in the argument: {(body.confidence * 100).toFixed(0)}%
          </p>

          <h2 className="mt-6 border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            the chain
          </h2>
          <ol className="mt-2 space-y-2">
            {body.chain.map((step) => (
              <li key={`${step.pin}-${step.claim}`} className="flex items-baseline gap-2">
                <span className="font-data text-[11px] text-thread">[{step.pin}]</span>
                <span className="text-[15px]">{step.claim}</span>
              </li>
            ))}
          </ol>

          <h2 className="mt-6 border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
            what cuts against it
          </h2>
          <ul className="mt-2 space-y-2">
            {body.counterConsiderations.map((point) => (
              <li key={point} className="text-[15px] text-ink-faded">
                {point}
              </li>
            ))}
          </ul>

          {body.citations.length > 0 && (
            <>
              <h2 className="mt-6 border-b border-rule pb-1 font-data text-[13px] text-ink-faded">
                what it rests on
              </h2>
              <ul className="mt-2 space-y-1">
                {body.citations.map((citation) => (
                  <li key={citation.pin} className="flex items-baseline gap-2">
                    <span className="font-data text-[11px] text-thread">[{citation.pin}]</span>
                    <span className="text-[13.5px] text-ink-faded">{citation.label}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )
    default:
      return null
  }
}
