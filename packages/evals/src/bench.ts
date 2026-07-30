import type { Mechanism } from '@uchronia/schemas'

/**
 * The intake benchmark (v2/M15): 28 PODs spanning modern (several WW2
 * variants), ancient, medieval, early-modern, obscure-but-real, deliberately
 * vague, adversarial garbage, and non-English phrasing. The mock lane asserts
 * these structural expectations against the demo engine on every CI run; the
 * live lane judges the same asks against the real model (docs/EVALS.md).
 */
export interface BenchExpectation {
  yearMin: number
  yearMax: number
  /** Acceptable primary regions (case-insensitive); omit to accept any. */
  regionOneOf?: string[]
  mechanismOneOf?: Mechanism[]
  /** Interpretation must offer at least this many candidates (default 1). */
  minCandidates?: number
  /** Garbage and vagueness must be confessed, not bluffed. */
  maxConfidence?: number
  minConfidence?: number
}

export interface BenchPod {
  id: string
  text: string
  tags: string[]
  expect: BenchExpectation
}

export const BENCHMARK: BenchPod[] = [
  // ---- the WW2 family (the headline gate) ---------------------------------
  {
    id: 'allies-lose-ww2',
    text: 'What if the Allies lost World War 2',
    tags: ['modern', 'ww2', 'headline'],
    expect: {
      yearMin: 1939,
      yearMax: 1945,
      regionOneOf: ['Europe'],
      mechanismOneOf: ['politics'],
      minCandidates: 2,
      minConfidence: 0.55,
    },
  },
  {
    id: 'axis-wins-wwii',
    text: 'What if Germany had won WWII?',
    tags: ['modern', 'ww2'],
    expect: { yearMin: 1939, yearMax: 1945, regionOneOf: ['Europe'], minCandidates: 2 },
  },
  {
    id: 'ww2-never-happens',
    text: 'What if the Second World War never happened',
    tags: ['modern', 'ww2'],
    expect: { yearMin: 1933, yearMax: 1945, regionOneOf: ['Europe'] },
  },
  {
    id: 'sea-lion',
    text: 'What if Operation Sea Lion succeeded in 1940',
    tags: ['modern', 'ww2'],
    expect: { yearMin: 1940, yearMax: 1940, regionOneOf: ['Europe'] },
  },
  {
    id: 'pearl-harbor-averted',
    text: 'What if Japan never attacked Pearl Harbor',
    tags: ['modern', 'ww2', 'pacific'],
    expect: { yearMin: 1941, yearMax: 1941, regionOneOf: ['East Asia'] },
  },
  {
    id: 'dday-fails',
    text: 'What if the D-Day landings failed in 1944',
    tags: ['modern', 'ww2'],
    expect: { yearMin: 1944, yearMax: 1944, regionOneOf: ['Europe'] },
  },
  // ---- other modern -------------------------------------------------------
  {
    id: 'no-october-revolution',
    text: 'What if the Russian Revolution failed in 1917',
    tags: ['modern'],
    expect: { yearMin: 1917, yearMax: 1917, regionOneOf: ['Europe'] },
  },
  {
    id: 'cold-war-hot',
    text: 'What if the Cold War turned hot',
    tags: ['modern'],
    expect: { yearMin: 1945, yearMax: 1962, minCandidates: 2 },
  },
  {
    id: 'apollo-continues',
    text: 'What if the Moon landing program never stopped',
    tags: ['modern'],
    expect: { yearMin: 1969, yearMax: 1972, regionOneOf: ['North America'] },
  },
  // ---- ancient ------------------------------------------------------------
  {
    id: 'alexandria-unburnt',
    text: 'What if the Library of Alexandria never burned?',
    tags: ['ancient'],
    expect: {
      yearMin: -300,
      yearMax: 400,
      regionOneOf: ['Mediterranean'],
      mechanismOneOf: ['knowledge'],
    },
  },
  {
    id: 'caesar-survives',
    text: 'What if Caesar survived the Ides of March in 44 BC',
    tags: ['ancient'],
    expect: { yearMin: -44, yearMax: -44, regionOneOf: ['Mediterranean'] },
  },
  {
    id: 'actium-reversed',
    text: 'What if Antony won at Actium in 31 BC',
    tags: ['ancient'],
    expect: { yearMin: -31, yearMax: -31, regionOneOf: ['Mediterranean'] },
  },
  {
    id: 'rome-stands',
    text: 'What if Rome never fell in 476',
    tags: ['ancient'],
    expect: { yearMin: 476, yearMax: 476, regionOneOf: ['Mediterranean'] },
  },
  {
    id: 'bronze-age-holds',
    text: 'What if the Bronze Age collapse never happened in 1177 BC',
    tags: ['ancient'],
    expect: { yearMin: -1177, yearMax: -1177 },
  },
  // ---- medieval -----------------------------------------------------------
  {
    id: 'constantinople-holds',
    text: 'What if Constantinople held in 1453',
    tags: ['medieval'],
    expect: { yearMin: 1453, yearMax: 1453, regionOneOf: ['Mediterranean', 'Europe'] },
  },
  {
    id: 'mongols-take-europe',
    text: 'What if the Mongols conquered Europe in 1242',
    tags: ['medieval'],
    expect: { yearMin: 1242, yearMax: 1242, regionOneOf: ['Europe'] },
  },
  {
    id: 'black-death-averted',
    text: 'What if the Black Death never reached Europe',
    tags: ['medieval'],
    expect: { yearMin: 1347, yearMax: 1353, mechanismOneOf: ['disease'] },
  },
  {
    id: 'press-suppressed',
    text: 'What if the printing press was suppressed in 1455',
    tags: ['medieval'],
    expect: { yearMin: 1455, yearMax: 1455, mechanismOneOf: ['knowledge', 'technology'] },
  },
  // ---- early modern -------------------------------------------------------
  {
    id: 'armada-lands',
    text: 'What if the Spanish Armada landed in 1588',
    tags: ['early-modern'],
    expect: { yearMin: 1588, yearMax: 1588, regionOneOf: ['Europe'] },
  },
  {
    id: 'treasure-fleets-sail',
    text: 'What if the Ming treasure fleets never stopped sailing in 1433',
    tags: ['early-modern'],
    expect: { yearMin: 1433, yearMax: 1433, regionOneOf: ['East Asia'] },
  },
  {
    id: 'french-revolution-fails',
    text: 'What if the French Revolution failed',
    tags: ['early-modern'],
    expect: { yearMin: 1787, yearMax: 1795, regionOneOf: ['Europe'], minCandidates: 2 },
  },
  // ---- obscure but real ---------------------------------------------------
  {
    id: 'taiping-succeeds',
    text: 'What if the Taiping rebellion succeeded in 1864',
    tags: ['obscure'],
    expect: { yearMin: 1864, yearMax: 1864, regionOneOf: ['East Asia'] },
  },
  {
    id: 'carrington-1989',
    text: 'What if a Carrington-class storm struck the grid in 1989',
    tags: ['obscure'],
    expect: { yearMin: 1989, yearMax: 1989, mechanismOneOf: ['environment', 'technology'] },
  },
  {
    id: 'haber-fails',
    text: 'What if the Haber process failed in 1909',
    tags: ['obscure'],
    expect: { yearMin: 1909, yearMax: 1909, mechanismOneOf: ['technology'] },
  },
  // ---- deliberately vague -------------------------------------------------
  {
    id: 'vague-plague',
    text: 'What if the plague never came?',
    tags: ['vague'],
    expect: { yearMin: -3000, yearMax: 2100, mechanismOneOf: ['disease'] },
  },
  {
    id: 'vague-progress',
    text: 'What if everything had gone differently?',
    tags: ['vague'],
    expect: { yearMin: -3000, yearMax: 2100, maxConfidence: 0.55 },
  },
  // ---- adversarial garbage ------------------------------------------------
  {
    id: 'garbage-keysmash',
    text: 'asdf qwerty zxcv plugh xyzzy',
    tags: ['garbage'],
    expect: { yearMin: -3000, yearMax: 2100, maxConfidence: 0.55 },
  },
  {
    id: 'garbage-repeat',
    text: 'What if if if if if if',
    tags: ['garbage'],
    expect: { yearMin: -3000, yearMax: 2100, maxConfidence: 0.55 },
  },
  {
    id: 'garbage-emoji-digits',
    text: '🦄🦄🦄 1234567 ???',
    tags: ['garbage'],
    expect: { yearMin: -3000, yearMax: 2100, maxConfidence: 0.55 },
  },
  // ---- non-English --------------------------------------------------------
  {
    id: 'german-konstantinopel',
    text: 'Was wäre, wenn Konstantinopel 1453 standgehalten hätte?',
    tags: ['non-english'],
    expect: { yearMin: 1453, yearMax: 1453 },
  },
  {
    id: 'spanish-armada',
    text: '¿Y si la Armada Invencible hubiera desembarcado en 1588?',
    tags: ['non-english'],
    expect: { yearMin: 1588, yearMax: 1588 },
  },
]
