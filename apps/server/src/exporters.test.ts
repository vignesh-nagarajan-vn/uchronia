import { FX, fixtureAggregate } from '@uchronia/schemas/fixtures'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

describe('branch exports (F10)', () => {
  it('renders markdown with eras, marks, and the disclaimer', async () => {
    const { app } = makeTestApp()
    await postJson(app, '/api/import', fixtureAggregate())
    const res = await app.request(`/api/branches/${FX.rootBranch}/export.md`)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/markdown')
    const md = await res.text()
    expect(md).toContain('# The City That Held')
    expect(md).toContain('## The Siege That Failed')
    expect(md).toContain('plausibility 0.74')
    expect(md).toContain('◉ convergence')
    expect(md).toContain("Disputed - the critic's notes")
    expect(md).toContain('not scholarship, and not a source')
  })

  it('renders a self-contained static html edition', async () => {
    const { app } = makeTestApp()
    await postJson(app, '/api/import', fixtureAggregate())
    const res = await app.request(`/api/branches/${FX.childBranch}/export.html`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('The City That Held')
    // The child branch carries its sub-divergence and only its visible events.
    expect(html).toContain('this branch:')
    expect(html).toContain('Union of the Two Churches')
    expect(html).not.toContain('Ottoman guns take Belgrade')
    // Self-contained: no scripts, no external references.
    expect(html).not.toContain('<script')
    expect(html).not.toContain('http://')
    expect(html).not.toContain('https://')
    // The fixture letter artifact is typeset inline.
    expect(html).toContain('N. Barbaro')
  })
})
