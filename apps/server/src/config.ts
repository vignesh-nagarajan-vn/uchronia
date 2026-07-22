/**
 * Server configuration, read once from the environment.
 *
 * ANTHROPIC_API_KEY lives here and only here (§6). The value is never logged,
 * never serialized into a response, and never reaches the client — routes may
 * expose `keyConfigured` (a boolean) at most.
 */
export interface ServerConfig {
  port: number
  /** True when the whole app runs on the deterministic MockProvider. */
  mock: boolean
  /** Present only in live mode. Treat as a secret. */
  apiKey: string | undefined
  models: {
    generation: string
    critic: string
  }
  dbPath: string
}

export const DEFAULT_MODELS = {
  generation: 'claude-sonnet-4-6',
  critic: 'claude-haiku-4-5-20251001',
} as const

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const apiKey = env.ANTHROPIC_API_KEY?.trim() || undefined
  const mockRequested = env.UCHRONIA_MOCK === '1' || env.UCHRONIA_MOCK === 'true'
  // Mock mode is load-bearing: no key means we degrade to mock rather than crash.
  const mock = mockRequested || apiKey === undefined
  return {
    port: Number(env.UCHRONIA_PORT) || 8787,
    mock,
    apiKey: mock ? undefined : apiKey,
    models: {
      generation: env.UCHRONIA_MODEL_GENERATION?.trim() || DEFAULT_MODELS.generation,
      critic: env.UCHRONIA_MODEL_CRITIC?.trim() || DEFAULT_MODELS.critic,
    },
    dbPath: env.UCHRONIA_DB?.trim() || './data/uchronia.db',
  }
}
