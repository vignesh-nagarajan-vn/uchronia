/**
 * Shared prompt fragments. Every generation-facing template embeds these;
 * editing any of them bumps FRAGMENTS_VERSION and, per the docs directive,
 * the registry table in docs/GENERATION.md.
 */
export const FRAGMENTS_VERSION = '1.1.0'

/** P6: anti-cliché mandates, embedded verbatim in every generation prompt. */
export const ANTI_CLICHE_MANDATES = `Mandates for every consequence you write:
- Span registers. Consequences must reach beyond wars and treaties into the structural, cultural, economic, and mundane: prices, fashions, slang, schooling, food, street layouts, what people complain about.
- No reflexive catastrophe. Do not collapse into "and then a great war" unless the state you were given makes one structurally overdetermined, and then name the structure, not the drama.
- Structures move history. Individuals matter, but demography, geography, trade, and institutions matter more. When you credit a person, show the structural door they walked through.
- No teleology. You do not know where this history is going. Never write toward a dramatic endpoint, a moral, or the reader's present.
- No presentism. People act from the beliefs, categories, and information of their own time and place, not ours.`

/** §12: sensitive-history stance, embedded verbatim in every generation prompt. */
export const SENSITIVE_HISTORY_STANCE = `Register and gravity:
Write in a sober, historiographic register, the voice of a careful historian rather than a novelist or a wargamer. No glorification of violence or atrocity. Counterfactuals that involve mass suffering (conquest, plague, famine, persecution) are treated with the gravity of the real events they mirror: named costs, human scale, no relish. Real peoples and faiths are rendered without caricature.`

/**
 * The humanity mandate: prose that reads like a person wrote it. Embedded in
 * every template that produces reader-facing text. The em-dash ban here is
 * belt; the pipeline's output scrubber is suspenders.
 */
export const HUMAN_VOICE = `Voice (non-negotiable):
- Write like a person with a desk and a deadline, not like a language model. A working chronicler's hand: specific, plain, occasionally wry where the record permits it.
- Never use an em dash. Where one tempts you, choose a comma, a colon, a semicolon, parentheses, or a new sentence.
- Banned phrasing: "delve", "tapestry", "testament to", "underscores", "pivotal moment", "in the annals of", "marked a turning point", "stark reminder", "it is worth noting", neat rhetorical triads bolted to sentence ends, and any closing line that explains what the passage means. If a sentence could open any history of anything, cut it.
- Vary the pulse. A long sentence that wanders like a footnote, then a short one. Let some sentences end early.
- Concrete beats abstract: a price, a road, a name, the clause nobody read, the smell of pitch on the new fleet. Numbers where a chronicler would have them, vagueness where they would not.
- Permit imperfection. Chroniclers hedge, misdate by a season, editorialize in asides, admit what they could not find out. Uniform confidence is the tell of a machine.`

/** How prompts teach the model to reference world-state handles. */
export const HANDLE_CONVENTIONS = `Reference conventions (follow exactly):
- Entities are referenced by their kebab-case slug (e.g. byzantine-empire). Reference an existing slug from the roster, or introduce a new entity in newEntities and then reference its slug.
- Prior accepted events are referenced as e<number> exactly as listed in the context.
- Label your own drafts d1, d2, and so on in order, and use those labels in within-batch cause references.
- State patches are lists of {key, value} facts with scalar values (string, number, or boolean), legible ledger lines like {"key": "literacyRate", "value": 0.09}, never nested data.`
