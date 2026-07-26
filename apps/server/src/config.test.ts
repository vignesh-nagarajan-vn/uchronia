import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MODELS, loadConfig } from './config.js'

describe('loadConfig', () => {
  it('applies every default from an empty environment', () => {
    const config = loadConfig({})
    expect(config.port).toBe(8787)
    expect(config.host).toBe('127.0.0.1')
    expect(config.mock).toBe(true)
    expect(config.models).toEqual(DEFAULT_MODELS)
    expect(config.dbPath).toBe(resolve('./data/uchronia.db'))
    expect(config.maxRunTokens).toBe(3_000_000)
    expect(config.mockPaceMs).toBe(0)
    expect(config.seedDemo).toBe(false)
  })

  it('treats set-but-empty variables as unset (the copied-template shape)', () => {
    const config = loadConfig({
      UCHRONIA_MAX_RUN_TOKENS: '',
      UCHRONIA_MOCK_PACE_MS: '  ',
      UCHRONIA_SEED_DEMO: '',
      UCHRONIA_MODEL_GENERATION: '',
      UCHRONIA_HOST: '',
      ANTHROPIC_API_KEY: '',
      VERCEL: '1',
    })
    // The empty ceiling must fall back to the default, not silently disable it.
    expect(config.maxRunTokens).toBe(3_000_000)
    expect(config.mockPaceMs).toBe(250)
    expect(config.seedDemo).toBe(true)
    expect(config.models.generation).toBe(DEFAULT_MODELS.generation)
    expect(config.host).toBe('127.0.0.1')
    expect(config.mock).toBe(true)
  })

  it('still honors explicit zeros and explicit opt-outs', () => {
    const config = loadConfig({
      UCHRONIA_MAX_RUN_TOKENS: '0',
      UCHRONIA_MOCK_PACE_MS: '0',
      UCHRONIA_SEED_DEMO: '0',
      UCHRONIA_MOCK: '1',
      VERCEL: '1',
    })
    expect(config.maxRunTokens).toBe(0)
    expect(config.mockPaceMs).toBe(0)
    expect(config.seedDemo).toBe(false)
  })

  it('moves the database to /tmp and seeds the demo under Vercel', () => {
    const config = loadConfig({ VERCEL: '1' })
    expect(config.dbPath).toBe(resolve('/tmp/uchronia.db'))
    expect(config.seedDemo).toBe(true)
    expect(config.mockPaceMs).toBe(250)
  })

  it('redirects the database on any Lambda-shaped runtime without Vercel extras', () => {
    const config = loadConfig({ AWS_LAMBDA_FUNCTION_NAME: 'fn' })
    expect(config.dbPath).toBe(resolve('/tmp/uchronia.db'))
    // Seeding and pacing stay Vercel-specific.
    expect(config.seedDemo).toBe(false)
    expect(config.mockPaceMs).toBe(0)
  })

  it('goes live only with a key and no mock override, and binds where told', () => {
    const live = loadConfig({ ANTHROPIC_API_KEY: ' sk-test ', UCHRONIA_HOST: '0.0.0.0' })
    expect(live.mock).toBe(false)
    expect(live.apiKey).toBe('sk-test')
    expect(live.host).toBe('0.0.0.0')

    const forcedMock = loadConfig({ ANTHROPIC_API_KEY: 'sk-test', UCHRONIA_MOCK: '1' })
    expect(forcedMock.mock).toBe(true)
    expect(forcedMock.apiKey).toBeUndefined()
  })

  it('defaults generation to a structured-outputs-capable model', () => {
    // The provider sends output_config.format on every call; a default model
    // without structured outputs would 400 on the first live request.
    expect(DEFAULT_MODELS.generation).toBe('claude-sonnet-5')
  })
})
