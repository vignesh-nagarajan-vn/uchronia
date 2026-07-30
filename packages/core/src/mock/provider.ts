import type { LLMProvider, StructuredRequest, StructuredResult } from '../llm.js'
import { ProviderResponseError } from '../llm.js'
import type { Rng } from '../rng.js'
import { seededRng } from '../rng.js'
import {
  mockArtifactEncyclopedia,
  mockArtifactLetter,
  mockArtifactNewspaper,
  mockArtifactPoster,
} from './artifacts.js'
import { mockConvergenceScan } from './convergence.js'
import { mockCourtAdvocate, mockCourtJudge, mockCourtSkeptic } from './court.js'
import { mockCriticReview, mockRegenerateEvent } from './critic.js'
import { mockEraGenerate } from './era.js'
import { mockBiography, mockEraDeepDive, mockEventExpand } from './expanders.js'
import { mockPodInterpret } from './pod-interpret.js'
import { mockPodNormalize } from './pod-normalize.js'
import { mockDerivePressures } from './pressures.js'
import { mockPulse } from './pulse.js'
import { mockSeedConsequences } from './seed.js'
import { mockEraSpecialist, mockEraSynthesize } from './symposium.js'

export type MockHandler = (args: unknown, rng: Rng) => unknown

/**
 * The deterministic provider that makes the whole app demoable without an API
 * key (§4.6). Handlers are keyed by template id; each seeds a PRNG from the
 * request's seedKey, so identical inputs always produce identical fixtures -
 * that determinism is what CI and the integration tests stand on.
 *
 * Handlers are registered per pipeline stage as the milestones land.
 */
export class MockProvider implements LLMProvider {
  readonly mode = 'mock' as const
  private readonly handlers: Record<string, MockHandler>

  constructor(extraHandlers: Record<string, MockHandler> = {}) {
    this.handlers = { ...DEFAULT_HANDLERS, ...extraHandlers }
  }

  async complete(request: StructuredRequest): Promise<StructuredResult> {
    const handler = this.handlers[request.templateId]
    if (!handler) {
      throw new ProviderResponseError(
        `mock provider has no handler for template ${request.templateId}`,
      )
    }
    const rng = seededRng(`${request.templateId}@${request.templateVersion}:${request.seedKey}`)
    const value = handler(request.args, rng)
    return {
      value,
      raw: JSON.stringify(value),
      model: 'mock',
      mode: 'mock',
    }
  }
}

const DEFAULT_HANDLERS: Record<string, MockHandler> = {
  'pod-normalize': mockPodNormalize,
  'pod-interpret': mockPodInterpret,
  'seed-consequences': mockSeedConsequences,
  'critic-review': mockCriticReview,
  'regenerate-event': mockRegenerateEvent,
  'derive-pressures': mockDerivePressures,
  'era-generate': mockEraGenerate,
  'era-specialist': mockEraSpecialist,
  'era-synthesize': mockEraSynthesize,
  'court-advocate': mockCourtAdvocate,
  'court-skeptic': mockCourtSkeptic,
  'court-judge': mockCourtJudge,
  'convergence-scan': mockConvergenceScan,
  pulse: mockPulse,
  'event-expand': mockEventExpand,
  'era-deepdive': mockEraDeepDive,
  'entity-biography': mockBiography,
  'artifact-newspaper': mockArtifactNewspaper,
  'artifact-letter': mockArtifactLetter,
  'artifact-encyclopedia': mockArtifactEncyclopedia,
  'artifact-poster': mockArtifactPoster,
}
