import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { loadConfig } from './config.js'
import { createDeps } from './deps.js'

const config = loadConfig()
const deps = createDeps(config)
const app = createApp(deps)

serve({ fetch: app.fetch, port: config.port }, (info) => {
  const mode = config.mock ? 'mock' : 'live'
  console.log(`uchronia server listening on http://localhost:${info.port} (${mode} mode)`)
})
