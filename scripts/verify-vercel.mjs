/**
 * Fake-Vercel smoke test: stage the function exactly as Vercel's builder ships
 * it (api/index.mjs + apps/server/dist/** and nothing else from the repo),
 * import it under plain Node with VERCEL=1, and drive the exported handler
 * with real Requests. Proves, without deploying: the bundle loads outside any
 * TypeScript toolchain, better-sqlite3's prebuilt binding resolves, migrations
 * are found at the staged path, the inlined showcase chronicle seeds, and the
 * HTML export embeds its typefaces from the staged fonts.
 *
 * Run via `pnpm verify:vercel` (which builds the bundle first). CI runs it on
 * the ubuntu leg — the same OS Vercel builds on.
 */
import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const repoRoot = resolve(import.meta.dirname, '..')
const serverDir = join(repoRoot, 'apps', 'server')
const bundle = join(serverDir, 'dist', 'vercel.js')

if (!existsSync(bundle)) {
  console.error(
    'apps/server/dist/vercel.js missing — run `pnpm --filter @uchronia/server build:vercel` first',
  )
  process.exit(1)
}
for (const staged of ['dist/drizzle/meta/_journal.json', 'dist/fonts']) {
  if (!existsSync(join(serverDir, staged))) {
    console.error(`apps/server/${staged} missing — copy-vercel-assets.mjs did not run?`)
    process.exit(1)
  }
}

// Stage under apps/server so the bundle's external require('better-sqlite3')
// resolves through the walk-up to apps/server/node_modules, mirroring the
// symlink the tracer ships. Only the files Vercel would carry get copied.
const stage = join(serverDir, '.vercel-stage')
rmSync(stage, { recursive: true, force: true })
mkdirSync(join(stage, 'api'), { recursive: true })
cpSync(join(repoRoot, 'api', 'index.mjs'), join(stage, 'api', 'index.mjs'))
cpSync(join(serverDir, 'dist'), join(stage, 'apps', 'server', 'dist'), { recursive: true })

// The database goes to the OS temp dir, mirroring Vercel's /tmp (outside the
// task root) — and keeping the still-open SQLite handle out of the stage so
// cleanup works on Windows.
const dbPath = join(tmpdir(), `uchronia-verify-${process.pid}.db`)
process.env.VERCEL = '1'
process.env.UCHRONIA_DB = dbPath
process.env.UCHRONIA_MOCK_PACE_MS = '0'
delete process.env.ANTHROPIC_API_KEY
process.chdir(stage) // /var/task stand-in

const checks = []
const check = (name, ok, detail = '') => {
  checks.push([name, ok])
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

let server
try {
  const { default: handler } = await import(pathToFileURL(join(stage, 'api', 'index.mjs')))
  assert.equal(typeof handler, 'function', 'default export must be a handler function')
  check('bundle imports under plain Node (cold start: db + migrations + seed)', true)

  // Vercel's Node runtime invokes the function (req, res)-style AND its
  // helpers pre-consume the request stream, parking the parsed value on
  // req.body. Exercising both shapes through a real node:http server proves
  // the exact deployed contract: a fetch-shaped handler hangs every request,
  // and a stream-only handler hangs every POST.
  const simulateVercelHelpers = async (req) => {
    if (req.method === 'GET' || req.method === 'HEAD') return
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const raw = Buffer.concat(chunks)
    req.body =
      (req.headers['content-type'] ?? '').includes('application/json') && raw.length > 0
        ? JSON.parse(raw.toString('utf8'))
        : raw
  }
  server = createServer((req, res) => {
    const helpersMode = req.headers['x-verify-helpers'] === '1'
    const run = helpersMode ? simulateVercelHelpers(req).then(() => handler(req, res)) : handler(req, res)
    run.catch((error) => {
      res.statusCode = 500
      res.end(String(error))
    })
  })
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready))
  const { port } = server.address()
  const withTimeout = (promise, label) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`no response for ${label} within 15s: handler hang`)), 15_000),
      ),
    ])
  const get = (path) => withTimeout(fetch(`http://127.0.0.1:${port}${path}`), path)
  const post = (path, body, helpersMode) =>
    withTimeout(
      fetch(`http://127.0.0.1:${port}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(helpersMode ? { 'x-verify-helpers': '1' } : {}),
        },
        body: JSON.stringify(body),
      }),
      `POST ${path}${helpersMode ? ' (helpers)' : ''}`,
    )

  const health = await get('/api/health')
  const healthBody = await health.json()
  check(
    'GET /api/health',
    health.status === 200 && healthBody.ok === true && healthBody.mock === true,
    JSON.stringify(healthBody),
  )

  const timelines = await get('/api/timelines')
  const list = await timelines.json()
  check(
    'showcase chronicle seeded from the bundled ledger',
    timelines.status === 200 && Array.isArray(list) && list.length === 1,
    `${Array.isArray(list) ? list.length : '?'} timeline(s)`,
  )

  const rootBranchId = list[0]?.rootBranchId
  const view = await get(`/api/branches/${rootBranchId}/view`)
  const viewBody = await view.json()
  check(
    'branch view assembles (sqlite native binding + world replay)',
    view.status === 200 && Array.isArray(viewBody.events) && viewBody.events.length > 0,
    `${viewBody.events?.length ?? '?'} events`,
  )

  const html = await get(`/api/branches/${rootBranchId}/export.html`)
  const htmlText = await html.text()
  check(
    'HTML export embeds typefaces from the staged fonts',
    html.status === 200 && htmlText.includes('data:font/woff2;base64,'),
    `${Math.round(htmlText.length / 1024)} KB`,
  )

  const missing = await get('/api/timelines/nonexistent')
  check('unknown resource maps to 404 envelope', missing.status === 404)

  // The create flow is the first POST a visitor makes; test it under both
  // body regimes. helpersMode mirrors production Vercel exactly.
  const pod = { podText: 'The verification fleet returns, 1433', dial: 50, horizonYears: 60 }
  const created = await post('/api/timelines', pod, true)
  const createdBody = await created.json()
  check(
    'POST create works with a helpers-consumed body (production shape)',
    created.status === 201 && typeof createdBody.timeline?.id === 'string',
    `HTTP ${created.status}, "${createdBody.timeline?.title ?? '?'}"`,
  )
  const createdRaw = await post('/api/timelines', { ...pod, podText: 'A second fleet, 1434' }, false)
  check('POST create works with an intact body stream', createdRaw.status === 201)
} catch (error) {
  check('handler exercise', false, String(error?.stack ?? error))
} finally {
  server?.close()
  process.chdir(repoRoot)
  // Best-effort: the SQLite handle stays open for the process lifetime, and
  // Windows refuses to delete open files — leftovers land in the OS temp dir.
  for (const path of [stage, dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    try {
      rmSync(path, { recursive: true, force: true })
    } catch {}
  }
}

const failed = checks.filter(([, ok]) => !ok)
if (failed.length > 0) {
  console.error(`\n${failed.length} of ${checks.length} checks failed`)
  process.exit(1)
}
console.log(`\nall ${checks.length} checks passed — the function is Vercel-shaped`)
