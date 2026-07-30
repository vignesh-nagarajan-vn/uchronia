import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { makeTestApp, postJson } from './test-helpers.js'

/**
 * Property tests (v2/M15): malformed import documents and creation bodies
 * always answer with a 4xx envelope - never a 500, never a partial write.
 */
describe('import and creation under fuzz', () => {
  it('arbitrary JSON documents never 500 the import route or write anything', async () => {
    const { app } = makeTestApp()
    await fc.assert(
      fc.asyncProperty(fc.jsonValue({ maxDepth: 4 }), async (doc) => {
        const res = await postJson(app, '/api/import', doc)
        expect(res.status).toBeGreaterThanOrEqual(400)
        expect(res.status).toBeLessThan(500)
      }),
      { numRuns: 60 },
    )
    // Nothing partial ever persisted.
    const list = (await (await app.request('/api/timelines')).json()) as unknown[]
    expect(list).toHaveLength(0)
  })

  it('arbitrary creation bodies never 500', async () => {
    const { app } = makeTestApp()
    await fc.assert(
      fc.asyncProperty(fc.jsonValue({ maxDepth: 3 }), async (doc) => {
        const res = await postJson(app, '/api/timelines', doc)
        // Valid-shaped bodies may legitimately create (201); anything else 4xx.
        expect(res.status === 201 || (res.status >= 400 && res.status < 500)).toBe(true)
      }),
      { numRuns: 40 },
    )
  })

  it('non-JSON bodies get the 400 envelope', async () => {
    const { app } = makeTestApp()
    await fc.assert(
      fc.asyncProperty(fc.string({ maxLength: 200 }), async (body) => {
        const res = await app.request('/api/import', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: `{${body}`,
        })
        expect(res.status).toBe(400)
      }),
      { numRuns: 30 },
    )
  })
})
