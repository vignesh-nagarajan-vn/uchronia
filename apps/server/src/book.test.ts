import { BranchView, CreateTimelineResponse } from '@uchronia/schemas'
import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * The Book (v2/M21). Compilation costs nothing, so both outputs are checked
 * against a real derived branch rather than a fixture. The EPUB assertions
 * are about the format's actual rules, not about our own serializer agreeing
 * with itself: an EPUB a reader cannot open is not an export.
 */

async function derived() {
  const { app } = makeTestApp()
  const created = CreateTimelineResponse.parse(
    await (
      await postJson(app, '/api/timelines', {
        podText: 'The Library of Alexandria never burns in 48 BC',
        horizonYears: 80,
        epilogue: true,
      })
    ).json(),
  )
  const branchId = created.rootBranch.id
  await (await app.request(`/api/branches/${branchId}/generate`, { method: 'POST' })).text()
  const view = BranchView.parse(await (await app.request(`/api/branches/${branchId}/view`)).json())
  // One artifact, so the book has a plate to set.
  await postJson(app, `/api/branches/${branchId}/events/${view.events[2]?.id}/artifacts`, {
    kind: 'letter',
  })
  return { app, branchId, view }
}

describe('the commissioned chronicle, HTML (v2/M21)', () => {
  it('opens with a frontispiece and carries chapters, plates, and appendices', async () => {
    const { app, branchId, view } = await derived()
    const res = await app.request(`/api/branches/${branchId}/book.html`)
    expect(res.status).toBe(200)
    const html = await res.text()

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('class="frontispiece"')
    expect(html).toContain(view.timeline.title)
    expect(html).toContain(view.pod.statement)
    expect(html).toContain('In the attested record:')
    expect(html).toContain('class="chapter')
    expect(html).toContain('class="plate"')
    expect(html).toContain('<h2>Index</h2>')
    // The disclaimer travels with the artifact, because the artifact travels.
    expect(html).toContain('Speculative fiction')
    // Self-contained: nothing to fetch, so it reads offline and prints.
    expect(html).not.toMatch(/<script|<link rel="stylesheet"|src="http/)
  })

  it('marks the epilogue as a projection wherever it appears', async () => {
    const { app, branchId } = await derived()
    const html = await (await app.request(`/api/branches/${branchId}/book.html`)).text()
    expect(html).toContain('class="chapter speculative"')
    expect(html).toContain('Not history')
  })

  it('honours the lens filter, and leaves no blank chapters behind', async () => {
    const { app, branchId } = await derived()
    const all = await (await app.request(`/api/branches/${branchId}/book.html`)).text()
    const narrow = await (
      await app.request(`/api/branches/${branchId}/book.html?lenses=economic`)
    ).text()
    expect(narrow.length).toBeLessThan(all.length)
    // Every chapter that survived the filter has at least one event in it.
    const chapters = narrow.split('class="chapter').slice(1)
    for (const chapter of chapters) expect(chapter).toContain('class="event"')
  })

  it('drops the plates when the reader asks for none', async () => {
    const { app, branchId } = await derived()
    const plain = await (await app.request(`/api/branches/${branchId}/book.html?plates=0`)).text()
    expect(plain).not.toContain('class="plate"')
  })
})

describe('the commissioned chronicle, EPUB (v2/M21)', () => {
  it('packages a valid EPUB: stored mimetype first, container, manifest, spine', async () => {
    const { app, branchId } = await derived()
    const res = await app.request(`/api/branches/${branchId}/book.epub`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('application/epub+zip')

    const bytes = new Uint8Array(await res.arrayBuffer())
    // The one rule a generic zip helper gets wrong: "mimetype" must be the
    // first entry and stored uncompressed, so its bytes appear at a fixed
    // offset in the archive header.
    expect(strFromU8(bytes.slice(30, 38))).toBe('mimetype')
    expect(strFromU8(bytes.slice(38, 58))).toBe('application/epub+zip')

    const files = unzipSync(bytes)
    expect(strFromU8(files.mimetype as Uint8Array)).toBe('application/epub+zip')

    const container = strFromU8(files['META-INF/container.xml'] as Uint8Array)
    expect(container).toContain('full-path="OEBPS/content.opf"')

    const opf = strFromU8(files['OEBPS/content.opf'] as Uint8Array)
    expect(opf).toContain('<package')
    expect(opf).toContain('version="3.0"')
    expect(opf).toContain('properties="nav"')

    // Every spine itemref resolves to a manifest item, and every manifest
    // item resolves to a file actually in the archive.
    const manifest = new Map(
      [...opf.matchAll(/<item id="([^"]+)" href="([^"]+)"/g)].map((m) => [m[1], m[2]]),
    )
    const spine = [...opf.matchAll(/<itemref idref="([^"]+)"\/>/g)].map((m) => m[1])
    expect(spine.length).toBeGreaterThanOrEqual(2)
    for (const idref of spine) {
      const href = manifest.get(idref as string)
      expect(href, `spine references ${idref}`).toBeDefined()
      expect(files[`OEBPS/${href}`], `${href} is in the archive`).toBeDefined()
    }
    for (const href of manifest.values()) {
      expect(files[`OEBPS/${href}`], `${href} is in the archive`).toBeDefined()
    }

    // The navigation document is a real EPUB nav, not just a page of links.
    const nav = strFromU8(files['OEBPS/nav.xhtml'] as Uint8Array)
    expect(nav).toContain('epub:type="toc"')
    expect(nav).toContain('<?xml version="1.0" encoding="utf-8"?>')
  })

  it('carries the same history the HTML book does', async () => {
    const { app, branchId, view } = await derived()
    const bytes = new Uint8Array(
      await (await app.request(`/api/branches/${branchId}/book.epub`)).arrayBuffer(),
    )
    const files = unzipSync(bytes)
    const front = strFromU8(files['OEBPS/frontispiece.xhtml'] as Uint8Array)
    expect(front).toContain(view.timeline.title)
    const chapterFiles = Object.keys(files).filter((f) => /OEBPS\/chapter-\d+\.xhtml/.test(f))
    expect(chapterFiles.length).toBeGreaterThanOrEqual(2)
  })
})
