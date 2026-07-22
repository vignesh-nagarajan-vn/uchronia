import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { loadConfig } from './config.js'

describe('server app', () => {
  it('reports health and mock mode', async () => {
    const app = createApp(loadConfig({ UCHRONIA_MOCK: '1' }))
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, mock: true })
  })
})

describe('loadConfig', () => {
  it('falls back to mock mode without an API key', () => {
    const config = loadConfig({})
    expect(config.mock).toBe(true)
    expect(config.apiKey).toBeUndefined()
  })

  it('runs live when a key is present and mock is not forced', () => {
    const config = loadConfig({ ANTHROPIC_API_KEY: 'sk-test' })
    expect(config.mock).toBe(false)
    expect(config.apiKey).toBe('sk-test')
  })

  it('forces mock even when a key is present', () => {
    const config = loadConfig({ ANTHROPIC_API_KEY: 'sk-test', UCHRONIA_MOCK: '1' })
    expect(config.mock).toBe(true)
    expect(config.apiKey).toBeUndefined()
  })

  it('honors model overrides', () => {
    const config = loadConfig({ UCHRONIA_MODEL_GENERATION: 'claude-sonnet-5' })
    expect(config.models.generation).toBe('claude-sonnet-5')
    expect(config.models.critic).toBe('claude-haiku-4-5-20251001')
  })
})
