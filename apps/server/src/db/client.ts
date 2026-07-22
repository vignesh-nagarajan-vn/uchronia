import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

export type Db = BetterSQLite3Database

function migrationsFolder(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  // src/db/client.ts → apps/server/drizzle; bundled dist/index.js → apps/server/drizzle.
  const candidates = [
    join(here, '..', '..', 'drizzle'),
    join(here, '..', 'drizzle'),
    join(process.cwd(), 'drizzle'),
  ]
  const found = candidates.find((c) => existsSync(c))
  if (!found) throw new Error(`drizzle migrations folder not found near ${here}`)
  return found
}

/** Open (creating directories as needed) and migrate a SQLite database. */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') {
    mkdirSync(dirname(path), { recursive: true })
  }
  const sqlite = new Database(path)
  if (path !== ':memory:') sqlite.pragma('journal_mode = WAL')
  const db = drizzle(sqlite)
  migrate(db, { migrationsFolder: migrationsFolder() })
  return db
}
