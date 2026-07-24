/**
 * Mirror the built web app to a root-level dist/ for Vercel, whose framework
 * presets expect the output there. Idempotent: a stale mirror (build cache,
 * rerun) is replaced wholesale.
 */
import { cpSync, existsSync, readdirSync, rmSync } from 'node:fs'

const source = 'apps/web/dist'
if (!existsSync(`${source}/index.html`)) {
  console.error(`${source} has no index.html; did the web build run?`)
  process.exit(1)
}
rmSync('dist', { recursive: true, force: true })
cpSync(source, 'dist', { recursive: true })
console.log(`mirrored ${source} -> dist (${readdirSync('dist').length} entries)`)
