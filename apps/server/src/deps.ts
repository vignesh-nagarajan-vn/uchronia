import {
  type Clock,
  type IdGen,
  type LLMProvider,
  MockProvider,
  systemClock,
  ulidIdGen,
} from '@uchronia/core'
import type { ServerConfig } from './config.js'
import { openDatabase } from './db/client.js'
import { Repo } from './db/repo.js'

/** Everything the routes need, injected — tests build their own. */
export interface ServerDeps {
  config: ServerConfig
  repo: Repo
  provider: LLMProvider
  idgen: IdGen
  clock: Clock
}

export function createDeps(config: ServerConfig): ServerDeps {
  const db = openDatabase(config.dbPath)
  // Live AnthropicProvider is wired at M3; until then live mode degrades to mock.
  const provider: LLMProvider = new MockProvider()
  return {
    config,
    repo: new Repo(db),
    provider,
    idgen: ulidIdGen(),
    clock: systemClock,
  }
}
