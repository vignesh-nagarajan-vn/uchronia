import type { PulseDelta, PulseOut } from '@uchronia/schemas'
import type { PulseArgs } from '../prompts/pulse.js'
import type { Rng } from '../rng.js'

/**
 * Demo-mode pulse (v2/M19): deterministic, and deliberately modest. It reads
 * the real pressures and convergences it was handed rather than inventing
 * consequences, so the ghost preview a keyless reader sees is at least
 * structurally the same object a live one would get.
 */

const ENTITY_EFFECTS = [
  'loses the office this event handed it, and with it the standing that came free',
  'keeps its position but pays for it in the coin this event had been covering',
  'inherits the vacancy early, before it has the means to hold it',
  'is left carrying an arrangement made for circumstances that no longer obtain',
]

const PRESSURE_EFFECTS = [
  'tightens: the discharge this event provided never arrives',
  'slackens, having lost the occasion that was concentrating it',
  'redirects, finding the next weakest seam instead',
]

export function mockPulse(rawArgs: unknown, rng: Rng): PulseOut {
  const args = rawArgs as PulseArgs
  const flip =
    args.flip.trim().length > 0 ? args.flip.trim() : `${args.event.title} does not happen`

  const deltas: PulseDelta[] = []
  // Entities the state summary actually names, so the preview points at real rows.
  const slugs = [...args.stateSummary.matchAll(/^-\s+([a-z0-9-]{3,})/gm)]
    .map((m) => m[1])
    .filter((s): s is string => s !== undefined)
    .slice(0, 3)
  for (const slug of slugs) {
    deltas.push({
      kind: 'entity',
      subject: slug,
      effect: rng.pick(ENTITY_EFFECTS),
      confidence: Number((0.45 + rng.next() * 0.35).toFixed(2)),
    })
  }
  for (const pressure of args.pressures.slice(0, 2)) {
    deltas.push({
      kind: 'pressure',
      subject: pressure.name,
      effect: rng.pick(PRESSURE_EFFECTS),
      confidence: Number(Math.min(0.9, 0.3 + pressure.intensity * 0.6).toFixed(2)),
    })
  }
  // A pulse near a recorded convergence is the interesting case, so the demo
  // shows it happening rather than hiding it.
  const broken = args.convergences.slice(0, 1)
  for (const convergence of broken) {
    deltas.push({
      kind: 'convergence',
      subject: convergence.anchorId,
      effect: 'the road back to the attested record loses the step this event supplied',
      confidence: 0.5,
    })
  }
  while (deltas.length < 3) {
    deltas.push({
      kind: 'pressure',
      subject: 'the settled arrangement',
      effect: 'holds: nothing downstream of this event depended on it as tightly as it looked',
      confidence: 0.3,
    })
  }

  return {
    headline: `Without this, the ${args.event.dateLabel} settlement has to be made some other way, and the cost moves rather than disappearing.`,
    deltas: deltas.slice(0, 8),
    breaks: broken.map((c) => c.anchorId),
    suggestedSubPod: `${flip.charAt(0).toUpperCase()}${flip.slice(1).replace(/\.$/, '')}.`,
  }
}
