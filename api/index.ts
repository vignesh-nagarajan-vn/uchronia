/**
 * The Vercel edition of the server: the whole Hono app behind one catch-all
 * function (vercel.json rewrites /api/* here; the app already routes on /api
 * paths). Module scope runs once per warm instance, so the SQLite database
 * (/tmp on Vercel, per config defaults), migrations, and the showcase seed
 * all happen on cold start and are reused across requests.
 *
 * Serverless state is ephemeral by design here: a playground, not an archive.
 * See docs/DEPLOY.md and ADR-0003 before pointing a key at this.
 */
import { handle } from 'hono/vercel'
import { createApp } from '../apps/server/src/app.js'
import { loadConfig } from '../apps/server/src/config.js'
import { createDeps } from '../apps/server/src/deps.js'
import { seedDemoIfEmpty } from '../apps/server/src/seed-demo.js'

const serverConfig = loadConfig()
const deps = createDeps(serverConfig)
if (serverConfig.seedDemo) {
  try {
    seedDemoIfEmpty(deps)
  } catch (error) {
    console.warn('demo seeding failed; continuing with an empty ledger', error)
  }
}

export default handle(createApp(deps))
