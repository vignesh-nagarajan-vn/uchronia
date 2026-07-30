import { z } from 'zod'

/**
 * The technology-prerequisite DAG (v2/M15): per tech tag, a detection pattern,
 * a generous earliest-plausible year, and its prerequisites. The windows are
 * absurdity bounds, not real history: this engine deliberately lets histories
 * accelerate technology (penicillin fifty years early is a gallery POD), so a
 * window marks the year before which the tech is impossible under ANY
 * plausible acceleration - no radio in the middle ages. The machine validator
 * resolves each tag's effective floor as max(own window, every prerequisite's
 * effective floor) over the DAG.
 */
export const TechPrerequisite = z.object({
  tag: z.string().min(1),
  /** Case-insensitive regex source matched against an event's title + summary. */
  pattern: z.string().min(1),
  /** Generous lower bound; earlier appearances are machine violations. */
  earliestPlausibleYear: z.number().int(),
  /** Tags that must themselves be plausible by then (transitive floors). */
  requires: z.array(z.string()),
})
export type TechPrerequisite = z.infer<typeof TechPrerequisite>

export const TECH_PREREQUISITES: TechPrerequisite[] = [
  {
    tag: 'paper',
    pattern: '\\bpaper(?:mill|making)?\\b',
    earliestPlausibleYear: -250,
    requires: [],
  },
  {
    tag: 'printing-press',
    pattern: 'printing press|movable type|print shop',
    earliestPlausibleYear: 600,
    requires: ['paper'],
  },
  {
    tag: 'gunpowder',
    pattern: 'gunpowder|cannon\\b|musket|firearm|artillery',
    earliestPlausibleYear: 700,
    requires: [],
  },
  {
    tag: 'steam-engine',
    pattern: 'steam engine|steamship|steam-powered|steam power',
    earliestPlausibleYear: 1500,
    requires: [],
  },
  {
    tag: 'electricity',
    pattern: 'electricity|electrical grid|electric light|electric power|electrified',
    earliestPlausibleYear: 1600,
    requires: [],
  },
  {
    tag: 'telegraph',
    pattern: 'telegraph',
    earliestPlausibleYear: 1700,
    requires: ['electricity'],
  },
  {
    tag: 'telephone',
    pattern: 'telephone',
    earliestPlausibleYear: 1750,
    requires: ['electricity'],
  },
  {
    tag: 'radio',
    pattern: '\\bradio\\b|wireless broadcast|broadcasting station',
    earliestPlausibleYear: 1820,
    requires: ['electricity'],
  },
  {
    tag: 'combustion-engine',
    pattern: 'internal combustion|combustion engine|motorcar|automobile',
    earliestPlausibleYear: 1700,
    requires: [],
  },
  {
    tag: 'railway',
    pattern: 'railway|railroad|locomotive',
    earliestPlausibleYear: 1600,
    requires: ['steam-engine'],
  },
  {
    tag: 'powered-flight',
    pattern: 'airplane|aeroplane|aircraft|powered flight|bomber|fighter plane|air force',
    earliestPlausibleYear: 1800,
    requires: ['combustion-engine'],
  },
  {
    tag: 'photography',
    pattern: 'photograph',
    earliestPlausibleYear: 1700,
    requires: [],
  },
  {
    tag: 'vaccination',
    pattern: 'vaccin',
    earliestPlausibleYear: 1650,
    requires: [],
  },
  {
    tag: 'antibiotics',
    pattern: 'antibiotic|penicillin',
    earliestPlausibleYear: 1800,
    requires: [],
  },
  {
    tag: 'nuclear',
    pattern: 'nuclear|atomic bomb|atomic pile|uranium|fission',
    earliestPlausibleYear: 1880,
    requires: ['electricity'],
  },
  {
    tag: 'computer',
    pattern: '\\bcomputers?\\b|computing machine|calculating engine',
    earliestPlausibleYear: 1800,
    requires: ['electricity'],
  },
  {
    tag: 'rocketry',
    pattern: '\\brockets?\\b',
    earliestPlausibleYear: 1150,
    requires: ['gunpowder'],
  },
  {
    tag: 'spaceflight',
    pattern: 'spaceflight|satellite|orbital|spacecraft|space station',
    earliestPlausibleYear: 1900,
    requires: ['rocketry', 'radio'],
  },
  {
    tag: 'television',
    pattern: 'television',
    earliestPlausibleYear: 1870,
    requires: ['radio'],
  },
  {
    tag: 'internet',
    pattern: 'internet|computer network|world wide web',
    earliestPlausibleYear: 1900,
    requires: ['computer', 'telephone'],
  },
]
