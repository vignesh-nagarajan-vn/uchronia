import { describe, expect, it } from 'vitest'
import { loadConfig } from './config.js'
import { makeTestApp } from './test-helpers.js'

describe('server app', () => {
  it('reports health and mock mode', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, mock: true, mode: 'demo' })
  })

  it('maps malformed JSON bodies to a 400 envelope instead of a 500', async () => {
    const { app } = makeTestApp()
    const res = await app.request('/api/timelines', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    })
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('invalid-json')
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
