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
import type { DailyBudget, VisitorLedger } from './gate.js'
import { AnthropicProvider, livePing } from './providers/anthropic.js'

/** Everything the routes need, injected - tests build their own. */
export interface ServerDeps {
  config: ServerConfig
  repo: Repo
  provider: LLMProvider
  idgen: IdGen
  clock: Clock
  /** Tiny 1-token live connection check; absent in demo mode. */
  livePing?: () => Promise<{ model: string }>
  /** The day's token ledger (v2/M24); set by createApp so routes can report it. */
  budget?: DailyBudget
  /** The per-visitor day ledger (v2.1/M26); set by createApp alongside it. */
  visitors?: VisitorLedger
}

export function createDeps(config: ServerConfig): ServerDeps {
  const db = openDatabase(config.dbPath)
  const apiKey = config.mock ? undefined : config.apiKey
  const providerConfig = apiKey !== undefined ? { apiKey, models: config.models } : undefined
  return {
    config,
    repo: new Repo(db),
    provider: providerConfig ? new AnthropicProvider(providerConfig) : new MockProvider(),
    idgen: ulidIdGen(),
    clock: systemClock,
    livePing: providerConfig ? () => livePing(providerConfig) : undefined,
  }
}
