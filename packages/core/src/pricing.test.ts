import { describe, expect, it } from 'vitest'
import { estimateUsd, pricingFor } from './pricing.js'

describe('pricing', () => {
  it('resolves dated model ids to their family row', () => {
    expect(pricingFor('claude-haiku-4-5-20251001')?.inputPerMTok).toBe(1)
    expect(pricingFor('claude-sonnet-5')?.outputPerMTok).toBe(15)
    expect(pricingFor('claude-opus-5')?.inputPerMTok).toBe(5)
    expect(pricingFor('some-unknown-model')).toBeUndefined()
  })

  it('prices mixed-model usage and reports what it cannot price', () => {
    const { usd, unpriced } = estimateUsd({
      'claude-sonnet-5': { inputTokens: 1_000_000, outputTokens: 200_000 },
      'claude-haiku-4-5-20251001': {
        inputTokens: 500_000,
        outputTokens: 100_000,
        cacheReadTokens: 1_000_000,
      },
      'mystery-model': { inputTokens: 42, outputTokens: 42 },
    })
    // sonnet: 3.00 in + 3.00 out; haiku: 0.50 in + 0.50 out + 0.10 cache read
    expect(usd).toBeCloseTo(7.1, 5)
    expect(unpriced).toEqual(['mystery-model'])
  })

  it('prices cache writes at the 1.25x tier', () => {
    const { usd } = estimateUsd({
      'claude-sonnet-5': { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 1_000_000 },
    })
    expect(usd).toBeCloseTo(3.75, 5)
  })
})
