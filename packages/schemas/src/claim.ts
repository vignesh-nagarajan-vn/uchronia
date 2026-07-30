import { z } from 'zod'
import { AnchorRegion } from './convergence.js'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

/**
 * Claims (v2/M18): structured assertions an era makes about the world beyond
 * any single entity's ledger. Every claim hangs off the event that asserted
 * it, so a claim is branch-visible exactly when its event is, and a fork
 * inherits its parent's claims by the same rule as everything else.
 *
 * Two kinds land here in M18: coarse regional indices, which give pressures
 * something numeric to read, and name drift, which is how a history's
 * vocabulary shows that it went somewhere else. M22 adds region-control.
 */

export const REGIONAL_INDICES = ['population', 'economicVitality'] as const
export const RegionalIndex = z.enum(REGIONAL_INDICES)
export type RegionalIndex = z.infer<typeof RegionalIndex>

/** How far one era may move a regional index. Bigger jumps need a catastrophe. */
export const MAX_INDEX_DELTA = 12

/**
 * A coarse 0-100 reading for one region. Deliberately not a demographic
 * model: it is a legible dial that the pressures step can read and the
 * validator can police, and its `note` is what makes a movement auditable.
 */
export const RegionalIndexClaim = z.object({
  kind: z.literal('regional-index'),
  region: AnchorRegion,
  index: RegionalIndex,
  /** The reading after this event, 0-100. */
  value: z.number().int().min(0).max(100),
  /** Change from the previous reading on this branch, positive or negative. */
  delta: z.number().int(),
  note: z.string().min(1),
})
export type RegionalIndexClaim = z.infer<typeof RegionalIndexClaim>

export const NAME_DRIFT_KINDS = ['toponym', 'personal', 'title', 'institution'] as const
export const NameDriftKind = z.enum(NAME_DRIFT_KINDS)
export type NameDriftKind = z.infer<typeof NameDriftKind>

/**
 * A name the divergence moved. Naming claims only: Uchronia glosses what
 * things came to be called, and does not invent languages to call them in.
 */
export const NameDriftClaim = z.object({
  kind: z.literal('name-drift'),
  nameKind: NameDriftKind,
  /** What the attested record calls it. */
  attested: z.string().min(1),
  /** What this history calls it instead. */
  drifted: z.string().min(1),
  note: z.string().min(1),
})
export type NameDriftClaim = z.infer<typeof NameDriftClaim>

/**
 * Who holds a region, as of the event that says so (v2/M22). The map reads
 * these; nothing else depends on them, so a history that never mentions
 * control simply renders an uncoloured map rather than a wrong one.
 */
export const RegionControlClaim = z.object({
  kind: z.literal('region-control'),
  region: AnchorRegion,
  /** The polity's slug when it is an entity here, or its plain name. */
  holder: z.string().min(1),
  /** How firmly: contested ground and settled ground look different. */
  grip: z.enum(['contested', 'held', 'consolidated']),
  note: z.string().min(1),
})
export type RegionControlClaim = z.infer<typeof RegionControlClaim>

export const ClaimBody = z.discriminatedUnion('kind', [
  RegionalIndexClaim,
  NameDriftClaim,
  RegionControlClaim,
])
export type ClaimBody = z.infer<typeof ClaimBody>

export const CLAIM_KINDS = ['regional-index', 'name-drift', 'region-control'] as const
export const ClaimKind = z.enum(CLAIM_KINDS)
export type ClaimKind = z.infer<typeof ClaimKind>

export const Claim = z.object({
  id: UlidString,
  branchId: UlidString,
  /** The event that asserted it. Claims are never free-floating. */
  eventId: UlidString,
  year: z.number().int(),
  body: ClaimBody,
  provenance: Provenance,
})
export type Claim = z.infer<typeof Claim>
