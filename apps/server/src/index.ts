import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDeps } from './deps.js'
import { seedDemoIfEmpty } from './seed-demo.js'

// README documents `cp .env.example .env` at the repo root; honor it here in
// the long-lived server entry (never in tests or the serverless path). The
// nearest file wins and real environment variables always take precedence.
for (const candidate of [join(process.cwd(), '.env'), join(process.cwd(), '..', '..', '.env')]) {
  if (!existsSync(candidate)) continue
  for (const [key, value] of Object.entries(parseEnv(readFileSync(candidate, 'utf8')))) {
    if (!(key in process.env) && value !== undefined) process.env[key] = value
  }
  break
}

const config = loadConfig()
const deps = createDeps(config)
if (config.seedDemo) {
  try {
    seedDemoIfEmpty(deps)
  } catch (error) {
    console.warn('demo seeding failed; continuing with an empty ledger', error)
  }
}
const app = createApp(deps)

// Production single-container mode: serve the built web app next to the API.
// The SPA owns every non-/api path, so unknown routes fall back to index.html.
if (config.staticDir) {
  const indexHtml = join(config.staticDir, 'index.html')
  if (!existsSync(indexHtml)) {
    console.warn(
      `UCHRONIA_STATIC_DIR is set but ${indexHtml} does not exist; not serving static files`,
    )
  } else {
    const staticRoot = config.staticDir
    app.use('/*', serveStatic({ root: staticRoot }))
    const fallback = readFileSync(indexHtml, 'utf8')
    app.get('*', (c) => (c.req.path.startsWith('/api') ? c.notFound() : c.html(fallback)))
  }
}

serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  const mode = config.mock ? 'mock' : 'live'
  const shown = config.host === '0.0.0.0' || config.host === '::' ? 'localhost' : config.host
  console.log(`uchronia server listening on http://${shown}:${info.port} (${mode} mode)`)
  console.log(`  bound to: ${config.host}`)
  console.log(`  db: ${config.dbPath}`)
  if (config.staticDir) console.log(`  serving web app from: ${config.staticDir}`)
  if (config.mockPaceMs > 0) console.log(`  mock pacing: ${config.mockPaceMs}ms/event`)
})
