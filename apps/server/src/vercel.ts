/**
 * The Vercel entry: the whole Hono app as one fetch-shaped handler, prebundled
 * to plain ESM by esbuild (`pnpm --filter @uchronia/server build:vercel`) so
 * Vercel's function builder never has to compile workspace TypeScript — it
 * traces `api/index.mjs` → `dist/vercel.js` → the native better-sqlite3 and
 * nothing else. The showcase chronicle is inlined into the bundle at build
 * time; the drizzle migrations ride along in `dist/drizzle/` (copied by
 * scripts/copy-vercel-assets.mjs, shipped via vercel.json's includeFiles).
 *
 * Module scope runs once per warm instance, so the SQLite database (/tmp on
 * Vercel, per config defaults), migrations, and the seed all happen on cold
 * start and are reused across requests on that instance. Serverless state is
 * ephemeral by design here — and per-instance: a playground, not an archive.
 * See docs/DEPLOY.md and ADR-0003 before pointing a key at this.
 */
// The Node-runtime adapter, not hono/vercel: Vercel invokes this function
// (req, res)-style — its web-handler detection cannot see through the
// re-export into the bundle — and a fetch-shaped handler under (req, res)
// invocation writes nothing and hangs to the 60 s cap (504 on every call).
import { handle } from '@hono/node-server/vercel'
import demoLedger from '../../../demo/the-unburnt-library.uchronia.json' with { type: 'json' }
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDeps } from './deps.js'
import { seedDemoIfEmpty } from './seed-demo.js'

const serverConfig = loadConfig()
let deps: ReturnType<typeof createDeps>
try {
  deps = createDeps(serverConfig)
} catch (error) {
  // A boot failure here would otherwise surface as an opaque
  // FUNCTION_INVOCATION_FAILED; make the cause readable in the function logs.
  console.error(`cold start failed opening ${serverConfig.dbPath}`, error)
  throw error
}
if (serverConfig.seedDemo) {
  try {
    seedDemoIfEmpty(deps, demoLedger)
  } catch (error) {
    console.warn('demo seeding failed; continuing with an empty ledger', error)
  }
}

export default handle(createApp(deps))
