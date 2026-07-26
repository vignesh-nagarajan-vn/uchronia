/**
 * Stage the serverless bundle's runtime assets under dist/, next to vercel.js,
 * so one non-brace includeFiles glob ("apps/server/dist/**") ships everything:
 *   dist/drizzle/  — migration SQL + meta journal, read by drizzle's migrator
 *   dist/fonts/    — the four @fontsource woff2 files the HTML export embeds
 * Runs from apps/server (pnpm script cwd); resolves @fontsource through this
 * package's own dependencies.
 */
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, join } from 'node:path'

const require = createRequire(import.meta.url)

if (!existsSync('dist/vercel.js')) {
  console.error('dist/vercel.js missing; run build:vercel (esbuild step) first')
  process.exit(1)
}

cpSync('drizzle', 'dist/drizzle', { recursive: true })

const fontFiles = [
  '@fontsource/spectral/files/spectral-latin-400-normal.woff2',
  '@fontsource/spectral/files/spectral-latin-400-italic.woff2',
  '@fontsource/im-fell-english/files/im-fell-english-latin-400-normal.woff2',
  '@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2',
]
mkdirSync('dist/fonts', { recursive: true })
for (const spec of fontFiles) {
  cpSync(require.resolve(spec), join('dist/fonts', basename(spec)))
}

console.log(`staged dist/drizzle and ${fontFiles.length} export fonts beside dist/vercel.js`)
