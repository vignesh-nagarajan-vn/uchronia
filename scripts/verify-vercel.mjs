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

  // Vercel's Node runtime invokes the function (req, res)-style; exercising it
  // through a real node:http server proves that exact contract — a
  // fetch-shaped handler would hang here just as it does deployed.
  server = createServer(handler)
  await new Promise((ready) => server.listen(0, '127.0.0.1', ready))
  const { port } = server.address()
  const get = async (path) =>
    await Promise.race([
      fetch(`http://127.0.0.1:${port}${path}`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`no response for ${path} within 15s — handler hang`)), 15_000),
      ),
    ])

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
