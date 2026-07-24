import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDeps } from './deps.js'

const config = loadConfig()
const deps = createDeps(config)
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

serve({ fetch: app.fetch, port: config.port }, (info) => {
  const mode = config.mock ? 'mock' : 'live'
  console.log(`uchronia server listening on http://localhost:${info.port} (${mode} mode)`)
  console.log(`  db: ${config.dbPath}`)
  if (config.staticDir) console.log(`  serving web app from: ${config.staticDir}`)
  if (config.mockPaceMs > 0) console.log(`  mock pacing: ${config.mockPaceMs}ms/event`)
})
