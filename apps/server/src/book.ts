import type { World } from '@uchronia/core'
import { armsSvg } from '@uchronia/core'
import type { Artifact, Era, Event } from '@uchronia/schemas'
import { strToU8, zipSync } from 'fflate'

/**
 * The Book (v2/M21): a branch compiled into something a reader can keep.
 * Compilation is pure over the World, so both outputs (print-grade HTML and
 * EPUB) render the same book rather than reimplementing it twice.
 *
 * Nothing here calls a provider. A book is an arrangement of history that has
 * already been derived; if an era wants a better opening, the reader expands
 * it in the app and commissions again.
 */

export interface BookOptions {
  /** Only events touching these lenses are included; empty means all of them. */
  lenses?: string[]
  /** How many artifacts to set as plates per era. 0 leaves them out. */
  artifactDensity?: number
}

export interface BookChapter {
  numeral: string
  era: Era
  events: Event[]
  plates: Artifact[]
}

export interface Book {
  title: string
  subtitle: string
  /** The frontispiece's epigraph: the divergence, in its own words. */
  divergence: string
  baselineContext: string
  branchName: string
  chapters: BookChapter[]
  biographies: Array<{ name: string; slug: string; text: string }>
  convergences: Array<{ dateLabel: string; title: string; note: string; lateness: number }>
  /** The index: every entity, with the years it is implicated in. */
  index: Array<{ name: string; slug: string; years: number[] }>
  commissionedAt: string
}

const ROMAN = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
  'XIV',
  'XV',
  'XVI',
  'XVII',
  'XVIII',
  'XIX',
  'XX',
]

function yearLabel(year: number): string {
  return year < 0 ? `${Math.abs(year)} BC` : String(year)
}

export function compileBook(
  world: World,
  branchId: string,
  now: string,
  options: BookOptions = {},
): Book {
  const branch = world.getBranch(branchId)
  const lenses = new Set(options.lenses ?? [])
  const density = options.artifactDensity ?? 2

  const allEvents = world.resolveEvents(branchId)
  const events =
    lenses.size > 0 ? allEvents.filter((e) => e.lenses.some((l) => lenses.has(l))) : allEvents

  const chapters: BookChapter[] = world
    .resolveEras(branchId)
    .map((era, i) => {
      const eraEvents = events.filter((e) => e.eraId === era.id)
      const plates =
        density > 0 ? eraEvents.flatMap((e) => world.artifactsForEvent(e.id)).slice(0, density) : []
      return { numeral: ROMAN[i] ?? String(i + 1), era, events: eraEvents, plates }
    })
    // An era the lens filter emptied is not a chapter; it is a gap, and a book
    // with blank chapters reads as broken rather than as filtered.
    .filter((chapter) => chapter.events.length > 0)

  const entities = world.resolveEntities(branchId)
  const index = entities
    .map((entity) => ({
      name: entity.name,
      slug: entity.slug,
      years: [
        ...new Set(events.filter((e) => e.entityIds.includes(entity.id)).map((e) => e.date.year)),
      ].sort((a, b) => a - b),
    }))
    .filter((entry) => entry.years.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const byId = new Map(allEvents.map((e) => [e.id, e]))
  const convergences = world
    .resolveConvergences(branchId)
    .map((c) => {
      const event = byId.get(c.eventId)
      return {
        dateLabel: event?.date.label ?? '',
        title: event?.title ?? '',
        note: c.similarityNote,
        lateness: c.latenessYears,
      }
    })
    .filter((c) => c.title.length > 0)

  const biographies = world
    .allBiographies()
    .filter((b) => b.branchId === branchId)
    .map((bio) => {
      const entity = entities.find((e) => e.id === bio.entityId)
      return { name: entity?.name ?? 'unknown', slug: entity?.slug ?? '', text: bio.biography }
    })
    .filter((b) => b.slug.length > 0)

  return {
    title: world.timeline.title,
    subtitle: branch.parentBranchId === null ? 'the main line' : `a branch: ${branch.name}`,
    divergence: world.pod.statement,
    baselineContext: world.pod.baselineContext,
    branchName: branch.name,
    chapters,
    biographies,
    convergences,
    index,
    commissionedAt: now,
  }
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** The plate: an artifact set into the page, not linked away to. */
function plateHtml(artifact: Artifact): string {
  const body = artifact.body
  const lines: string[] = []
  switch (body.kind) {
    case 'newspaper':
      lines.push(`<p class="plate-head">${esc(body.masthead)}</p>`)
      lines.push(`<p class="plate-sub">${esc(body.dateline)}</p>`)
      lines.push(`<p class="plate-headline">${esc(body.headline)}</p>`)
      for (const column of body.columns.slice(0, 1)) {
        for (const para of column.paragraphs.slice(0, 2)) lines.push(`<p>${esc(para)}</p>`)
      }
      break
    case 'letter':
      lines.push(`<p class="plate-sub">${esc(body.place)}, ${esc(body.dateLabel)}</p>`)
      lines.push(`<p>${esc(body.salutation)}</p>`)
      for (const para of body.paragraphs.slice(0, 2)) lines.push(`<p>${esc(para)}</p>`)
      lines.push(`<p class="plate-sign">${esc(body.signature)}</p>`)
      break
    case 'telegram':
      lines.push(`<p class="plate-head">${esc(body.office)}</p>`)
      lines.push(`<p class="plate-wire">${esc(body.words.join(' STOP '))} STOP</p>`)
      break
    case 'obituary':
      lines.push(`<p class="plate-head">${esc(body.publication)}</p>`)
      lines.push(`<p class="plate-headline">${esc(body.headline)}</p>`)
      for (const para of body.paragraphs.slice(0, 2)) lines.push(`<p>${esc(para)}</p>`)
      break
    default:
      lines.push(`<p class="plate-head">${esc(artifact.title)}</p>`)
  }
  return `<figure class="plate"><div class="plate-inner">${lines.join('')}</div><figcaption>${esc(artifact.kind)}: ${esc(artifact.title)}</figcaption></figure>`
}

const BOOK_CSS = `
:root { --ink:#1a1a17; --faded:#6b675e; --rule:#cfc9ba; --record:#2d4f7c; --thread:#a33a2a; }
* { box-sizing: border-box; }
body { margin:0; color:var(--ink); background:#faf7f0; font-family:Spectral,Georgia,serif; line-height:1.65; }
.page { max-width: 34em; margin: 0 auto; padding: 4rem 1.5rem; }
.frontispiece { min-height: 80vh; display:flex; flex-direction:column; justify-content:center; text-align:center; page-break-after: always; }
.frontispiece h1 { font-size: 2.6rem; line-height:1.1; margin:0 0 .5rem; }
.frontispiece .sub { color:var(--faded); font-style:italic; margin:0 0 2.5rem; }
.frontispiece .epigraph { border-top:1px solid var(--rule); border-bottom:1px solid var(--rule); padding:1.5rem 0; margin:0 0 1.5rem; font-size:1.1rem; }
.frontispiece .record { color:var(--record); font-size:.9rem; text-align:left; }
.chapter { page-break-before: always; }
.chapter h2 { font-size:1.6rem; margin:0; line-height:1.2; }
.chapter .numeral { color:var(--thread); font-size:2.4rem; display:block; line-height:1; }
.chapter .span { color:var(--faded); font-size:.95rem; font-weight:normal; }
.chapter .opening { font-style:italic; color:var(--faded); margin:.5rem 0 2rem; }
.event { margin: 0 0 1.6rem; }
.event .date { color:var(--faded); font-size:.8rem; letter-spacing:.04em; margin:0; font-family:ui-monospace,monospace; }
.event h3 { font-size:1.05rem; margin:.1rem 0 .3rem; }
.event p { margin:.3rem 0; }
.event .marks { color:var(--faded); font-size:.78rem; font-family:ui-monospace,monospace; }
.speculative { border-left:3px solid var(--rule); padding-left:1rem; }
.speculative .warn { color:#7c5310; font-size:.8rem; font-family:ui-monospace,monospace; }
.plate { border:1px solid var(--rule); padding:1rem; margin:1.2rem 0; background:#fffdf7; }
.plate-inner p { margin:.25rem 0; font-size:.9rem; }
.plate-head { text-align:center; letter-spacing:.12em; text-transform:uppercase; font-size:.75rem !important; color:var(--faded); }
.plate-headline { font-size:1.1rem !important; text-align:center; }
.plate-sub, .plate-sign { color:var(--faded); font-size:.8rem !important; }
.plate-wire { font-family:ui-monospace,monospace; text-transform:uppercase; letter-spacing:.05em; }
figcaption { color:var(--faded); font-size:.75rem; margin-top:.6rem; font-family:ui-monospace,monospace; }
.appendix { page-break-before: always; }
.appendix h2 { font-size:1.3rem; border-bottom:1px solid var(--rule); padding-bottom:.3rem; }
.arms { display:inline-block; vertical-align:middle; margin-right:.5rem; }
.index-entry { display:flex; justify-content:space-between; gap:1rem; border-bottom:1px solid var(--rule); padding:.3rem 0; }
.index-entry .years { color:var(--faded); font-size:.8rem; font-family:ui-monospace,monospace; }
.colophon { color:var(--faded); font-size:.8rem; text-align:center; margin-top:3rem; }
@media print { body { background:#fff; } .page { padding: 0; } }
`

function chapterHtml(chapter: BookChapter): string {
  const speculative = chapter.era.speculative
  return `<section class="chapter${speculative ? ' speculative' : ''}">
<header>
<span class="numeral">${chapter.numeral}</span>
<h2>${esc(chapter.era.title)} <span class="span">${yearLabel(chapter.era.startYear)}-${yearLabel(chapter.era.endYear)}</span></h2>
${speculative ? '<p class="warn">Not history: a projection past the horizon this chronicle was derived to.</p>' : ''}
<p class="opening">${esc(chapter.era.summary)}</p>
</header>
${chapter.events
  .map((event) => {
    const marks = [`plausibility ${event.plausibility.score.toFixed(2)}`]
    if (event.wildcard) marks.push('wildcard')
    if (event.flags.disputed) marks.push('disputed')
    if (event.flags.contested) marks.push('contested')
    if (event.flags.convergence) marks.push('converges with the record')
    return `<article class="event">
<p class="date">${esc(event.date.label)}</p>
<h3>${esc(event.title)}</h3>
<p>${esc(event.summary)}</p>
${
  event.detail
    ? event.detail
        .split('\n\n')
        .map((p) => `<p>${esc(p)}</p>`)
        .join('')
    : ''
}
<p class="marks">${marks.join(' · ')}</p>
</article>`
  })
  .join('\n')}
${chapter.plates.map(plateHtml).join('\n')}
</section>`
}

function appendicesHtml(book: Book): string {
  const parts: string[] = []
  if (book.biographies.length > 0) {
    parts.push(`<section class="appendix">
<h2>Lives</h2>
${book.biographies
  .map(
    (bio) =>
      `<article><h3><span class="arms">${armsSvg(bio.slug, 28)}</span>${esc(bio.name)}</h3>${bio.text
        .split('\n\n')
        .map((p) => `<p>${esc(p)}</p>`)
        .join('')}</article>`,
  )
  .join('\n')}
</section>`)
  }
  if (book.convergences.length > 0) {
    parts.push(`<section class="appendix">
<h2>Where this history rhymed</h2>
<p class="opening">Moments at which the divergent record arrived, by another road, somewhere the attested one already stood.</p>
${book.convergences
  .map(
    (c) =>
      `<article class="event"><p class="date">${esc(c.dateLabel)}</p><h3>${esc(c.title)}</h3><p>${esc(c.note)}</p><p class="marks">${c.lateness === 0 ? 'on schedule' : `${Math.abs(c.lateness)} years ${c.lateness > 0 ? 'late' : 'early'}`}</p></article>`,
  )
  .join('\n')}
</section>`)
  }
  if (book.index.length > 0) {
    parts.push(`<section class="appendix">
<h2>Index</h2>
${book.index
  .map(
    (entry) =>
      `<div class="index-entry"><span>${esc(entry.name)}</span><span class="years">${entry.years.map(yearLabel).join(', ')}</span></div>`,
  )
  .join('\n')}
</section>`)
  }
  return parts.join('\n')
}

/** The book as one self-contained, print-grade HTML file. */
export function renderBookHtml(book: Book): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${esc(book.title)}</title>
<style>${BOOK_CSS}</style>
</head><body><main class="page">
<section class="frontispiece">
<h1>${esc(book.title)}</h1>
<p class="sub">${esc(book.subtitle)}</p>
<blockquote class="epigraph">${esc(book.divergence)}</blockquote>
<p class="record">In the attested record: ${esc(book.baselineContext)}</p>
</section>
${book.chapters.map(chapterHtml).join('\n')}
${appendicesHtml(book)}
<p class="colophon">Commissioned ${esc(book.commissionedAt.slice(0, 10))} from Uchronia. Speculative fiction: no part of this is a historical source.</p>
</main></body></html>`
}

/** XHTML for EPUB, which is stricter than HTML about being well-formed. */
function xhtml(title: string, body: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head><meta charset="utf-8"/><title>${esc(title)}</title><link rel="stylesheet" href="style.css"/></head>
<body>${body}</body></html>`
}

/**
 * The book as an EPUB 3 file. Packaged by hand rather than by a library,
 * because the format is small and the one rule that matters (the mimetype
 * entry must come first and be stored uncompressed) is exactly the rule a
 * generic zip helper gets wrong.
 */
export function renderEpub(book: Book, identifier: string): Uint8Array {
  const chapters = book.chapters.map((chapter, i) => ({
    href: `chapter-${i + 1}.xhtml`,
    id: `chap${i + 1}`,
    title: `${chapter.numeral}. ${chapter.era.title}`,
    content: xhtml(chapter.era.title, chapterHtml(chapter)),
  }))
  const appendix = appendicesHtml(book)
  const extra = appendix
    ? [
        {
          href: 'appendices.xhtml',
          id: 'appendices',
          title: 'Appendices',
          content: xhtml('Appendices', appendix),
        },
      ]
    : []
  const documents = [
    {
      href: 'frontispiece.xhtml',
      id: 'front',
      title: book.title,
      content: xhtml(
        book.title,
        `<section class="frontispiece"><h1>${esc(book.title)}</h1><p class="sub">${esc(book.subtitle)}</p><blockquote class="epigraph">${esc(book.divergence)}</blockquote><p class="record">In the attested record: ${esc(book.baselineContext)}</p></section>`,
      ),
    },
    ...chapters,
    ...extra,
  ]

  const nav = xhtml(
    'Contents',
    `<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc" id="toc"><h1>Contents</h1><ol>${documents
      .map((d) => `<li><a href="${d.href}">${esc(d.title)}</a></li>`)
      .join('')}</ol></nav>`,
  )

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="pub-id">
<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:identifier id="pub-id">urn:uuid:${identifier}</dc:identifier>
<dc:title>${esc(book.title)}</dc:title>
<dc:language>en</dc:language>
<dc:description>${esc(book.divergence)}</dc:description>
<meta property="dcterms:modified">${book.commissionedAt.slice(0, 19)}Z</meta>
</metadata>
<manifest>
<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
<item id="css" href="style.css" media-type="text/css"/>
${documents.map((d) => `<item id="${d.id}" href="${d.href}" media-type="application/xhtml+xml"/>`).join('\n')}
</manifest>
<spine>
${documents.map((d) => `<itemref idref="${d.id}"/>`).join('\n')}
</spine>
</package>`

  const container = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>`

  const files: Record<string, [Uint8Array, { level: 0 | 6 }]> = {
    // Stored, not deflated, and written first: this is what makes the archive
    // an EPUB rather than a zip that happens to contain one.
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': [strToU8(container), { level: 6 }],
    'OEBPS/content.opf': [strToU8(opf), { level: 6 }],
    'OEBPS/nav.xhtml': [strToU8(nav), { level: 6 }],
    'OEBPS/style.css': [strToU8(BOOK_CSS), { level: 6 }],
  }
  for (const doc of documents) {
    files[`OEBPS/${doc.href}`] = [strToU8(doc.content), { level: 6 }]
  }
  return zipSync(files)
}
