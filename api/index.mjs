/**
 * Vercel function entry. The real app is prebundled to plain ESM JavaScript by
 * `pnpm --filter @uchronia/server build:vercel` (the first step of
 * vercel.json's buildCommand), so the function builder only traces this
 * re-export plus the native better-sqlite3 dependency - no TypeScript
 * compilation, no workspace resolution, nothing clever. See docs/DEPLOY.md.
 */
export { default } from '../apps/server/dist/vercel.js'
