import { z } from 'zod'
import { UlidString } from './ids.js'
import { Provenance } from './provenance.js'

export const ARTIFACT_KINDS = [
  'newspaper',
  'letter',
  'encyclopedia',
  'poster',
  // The forge's second shelf (v2/M20): shorter forms, and the registers they
  // are stuck with. A telegram cannot afford adjectives; an obituary cannot
  // avoid a verdict; a classified page says what a society is short of.
  'telegram',
  'radio',
  'obituary',
  'classified',
  // A finding, saved (v2/M23). Not a period document: the app's own answer.
  'inquiry',
] as const
export const ArtifactKind = z.enum(ARTIFACT_KINDS)
export type ArtifactKind = z.infer<typeof ArtifactKind>

/**
 * The kinds the forge can produce from an event. `inquiry` is stored as an
 * artifact so it lands on the same shelf and travels in the same export, but
 * it is not forgeable: it is saved from a Grand Inquiry, which starts from a
 * thesis rather than from an event.
 */
export const FORGEABLE_ARTIFACT_KINDS = ARTIFACT_KINDS.filter(
  (k) => k !== 'inquiry',
) as readonly ArtifactKind[]

/** A front page from inside the timeline. */
export const NewspaperBody = z.object({
  kind: z.literal('newspaper'),
  masthead: z.string().min(1),
  /** e.g. "Alexandria - 14 Thoth, Year 412 of the Common Reckoning". */
  dateline: z.string().min(1),
  headline: z.string().min(1),
  subhead: z.string().nullable(),
  columns: z
    .array(
      z.object({
        heading: z.string().nullable(),
        paragraphs: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1)
    .max(4),
  /** Small notices and advertisements along the bottom. */
  notices: z.array(z.string().min(1)),
})
export type NewspaperBody = z.infer<typeof NewspaperBody>

export const LetterBody = z.object({
  kind: z.literal('letter'),
  from: z.string().min(1),
  to: z.string().min(1),
  place: z.string().min(1),
  dateLabel: z.string().min(1),
  salutation: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  closing: z.string().min(1),
  signature: z.string().min(1),
  postscript: z.string().nullable(),
})
export type LetterBody = z.infer<typeof LetterBody>

/** An entry from an in-world encyclopedia - not ours. */
export const EncyclopediaBody = z.object({
  kind: z.literal('encyclopedia'),
  encyclopediaTitle: z.string().min(1),
  editionNote: z.string().min(1),
  headword: z.string().min(1),
  entryParagraphs: z.array(z.string().min(1)).min(1),
  seeAlso: z.array(z.string().min(1)),
})
export type EncyclopediaBody = z.infer<typeof EncyclopediaBody>

export const PosterBody = z.object({
  kind: z.literal('poster'),
  headline: z.string().min(1),
  subheadline: z.string().nullable(),
  lines: z.array(z.string().min(1)),
  issuer: z.string().min(1),
  slogan: z.string().nullable(),
})
export type PosterBody = z.infer<typeof PosterBody>

/**
 * A telegram: charged by the word, so the prose has to earn its keep.
 * `words` are the transmitted lines, rendered with STOP between them.
 */
export const TelegramBody = z.object({
  kind: z.literal('telegram'),
  office: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  filedAt: z.string().min(1),
  /** Each line is one clause; the renderer punctuates them. */
  words: z.array(z.string().min(1)).min(2).max(12),
  /** The clerk's marginal note, when there is one. */
  endorsement: z.string().nullable(),
})
export type TelegramBody = z.infer<typeof TelegramBody>

/** A transcript of a broadcast, with the interruptions left in. */
export const RadioBody = z.object({
  kind: z.literal('radio'),
  station: z.string().min(1),
  programme: z.string().min(1),
  airedAt: z.string().min(1),
  lines: z
    .array(
      z.object({
        speaker: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .min(2),
  /** Transmission faults, silences, and what the monitor wrote down. */
  annotations: z.array(z.string().min(1)),
})
export type RadioBody = z.infer<typeof RadioBody>

/** A death notice, which is always partly an argument about a life. */
export const ObituaryBody = z.object({
  kind: z.literal('obituary'),
  publication: z.string().min(1),
  headline: z.string().min(1),
  subject: z.string().min(1),
  lifespan: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  /** The line the notice will be remembered for, when it has one. */
  epitaph: z.string().nullable(),
})
export type ObituaryBody = z.infer<typeof ObituaryBody>

/**
 * The classified page: the most honest document a society produces, because
 * nobody writing it is trying to be read by posterity.
 */
export const ClassifiedBody = z.object({
  kind: z.literal('classified'),
  publication: z.string().min(1),
  dateLabel: z.string().min(1),
  sections: z
    .array(
      z.object({
        heading: z.string().min(1),
        notices: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1)
    .max(5),
})
export type ClassifiedBody = z.infer<typeof ClassifiedBody>

/**
 * A saved Grand Inquiry (v2/M23). Unlike its shelf-mates this is not a
 * diegetic document: it is the app answering a question about the history,
 * and it is rendered so nobody mistakes it for a period source.
 */
export const InquiryBody = z.object({
  kind: z.literal('inquiry'),
  thesis: z.string().min(1),
  verdict: z.string().min(1),
  confidence: z.number().min(0).max(1),
  chain: z.array(z.object({ pin: z.string().min(1), claim: z.string().min(1) })),
  counterConsiderations: z.array(z.string().min(1)),
  citations: z.array(
    z.object({
      pin: z.string().min(1),
      kind: z.enum(['event', 'artifact', 'claim']),
      id: z.string().min(1),
      label: z.string().min(1),
    }),
  ),
})
export type InquiryBody = z.infer<typeof InquiryBody>

export const ArtifactBody = z.discriminatedUnion('kind', [
  NewspaperBody,
  LetterBody,
  EncyclopediaBody,
  PosterBody,
  TelegramBody,
  RadioBody,
  ObituaryBody,
  ClassifiedBody,
  InquiryBody,
])
export type ArtifactBody = z.infer<typeof ArtifactBody>

/** Rendering hints the generator may pass to the typographic templates. */
export const StylingHints = z.object({
  tone: z.string().nullable(),
  period: z.string().nullable(),
})
export type StylingHints = z.infer<typeof StylingHints>

export const Artifact = z.object({
  id: UlidString,
  eventId: UlidString,
  kind: ArtifactKind,
  title: z.string().min(1),
  body: ArtifactBody,
  stylingHints: StylingHints,
  provenance: Provenance,
})
export type Artifact = z.infer<typeof Artifact>
