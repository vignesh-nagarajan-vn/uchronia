# Design: codename RED THREAD

The interface is the archive of a history that never happened: a scholar's ledger being written in real time, with the attested record underneath it in cyanotype blue. Every aesthetic decision derives from that fiction. **Finalized before the first UI commit (§7.8).**

## 1. Semantic color system

Color carries meaning; decoration is not allowed to steal it. Six named roles, two themes.

| Token | Survey (light) | Nitrate (dark) | Meaning, and nothing else |
| --- | --- | --- | --- |
| `--color-paper` | `#E8EAE3` | `#0F1420` | The page. Cool grey-green map stock / deep blue-black nitrate film |
| `--color-paper-raised` | `#EFF1EB` | `#161C2B` | Cards, panels, artifact sheets |
| `--color-ink` | `#22261F` | `#EDE8DC` | All generated narrative and UI text (iron-gall / warm off-white) |
| `--color-ink-faded` | `#5C6157` | `#A9A395` | Metadata, captions, secondary labels |
| `--color-record` | `#174A7C` | `#7FA9D9` | **Attested real history only**: baseline spine, anchors, convergence matches |
| `--color-thread` | `#A8281A` | `#D96A55` | **Divergence and causality only**: POD, red threads, fork marks, drop caps |
| `--color-thread-wash` | `rgba(168,40,26,.10)` | `rgba(217,106,85,.14)` | Hover/selection wash: thread meaning, low volume |
| `--color-record-wash` | `rgba(23,74,124,.08)` | `rgba(127,169,217,.12)` | Record-side wash (compare view shared rows) |
| `--color-rule` | `#C6CABF` | `#2A3245` | Hairlines, borders |

Contrast (WCAG AA): ink/paper ≈ 13:1 (light) / 14:1 (dark); ink-faded ≥ 5.2:1 both; record ≥ 6.5:1 both; thread ≈ 6.6:1 light / ≈ 4.6:1 dark (used for glyphs, rules, and ≥ 500-weight text only).

**Lens ticks** (F5 recolor without stealing red/blue): five muted earth hues used *only* for 3px lens tick-marks on event cards and filter chips: political `#4A4E45`, technological `#4F5D5C`, cultural `#6D4E63`, economic `#6B5E3F`, daily-life `#57604A` (dark theme: lightened variants). Never used for text.

## 2. Typography

Three roles, deliberately paired (self-hosted via @fontsource, no CDN):

| Role | Face | Usage | Scale |
| --- | --- | --- | --- |
| Ceremonial display | **IM Fell English** | Era numerals, artifact mastheads, rubricated drop caps, the wordmark. Never below 24px, never body/UI | drop cap 56px · masthead 40px · era numeral 32px |
| Body & UI | **Spectral** 400/500/600 | All narrative and interface text | body 16px/1.65 · h1 24px/600 · h2 19px/600 · h3 16.5px/500 · small 13.5px |
| Data | **IBM Plex Mono** 400/500 | Dates, plausibility stamps, IDs, ledger keys, coordinates | data 13px · stamp 12px letter-spaced |

## 3. Layout: the spine

One strong vertical spine per view; no broadsheet multi-column chrome. The hero moment is the fork drawn as one picture: the Prussian-blue baseline running down the page, visibly splitting at the POD, the red divergent spine peeling away.

```
V2 · Timeline                                    V1 · Atlas
┌──────────────────────────────────────┐        ┌──────────────────────────────┐
│ UCHRONIA   timeline ▸ branch    ⚙ ◐ │        │        UCHRONIA              │
├──────────────────────────────────────┤        │  a chronicle of times        │
│  │ (blue record rail)                │        │  that never were             │
│  │  1451 · Ottoman guns cast…(tick)  │        │ ┌──────────────────────────┐ │
│ POD ─┤╲  THE DIVERGENCE ────────────│        │ │ Write a divergence…      │ │
│  │   ╲ (red thread rail)            │        │ │ [dial ────●────] horizon │ │
│  │    ╲                             │        │ │        [Open a ledger]   │ │
│  │  ┌─[I]─ THE FIRST RIPPLES ─────┐ │        │ └──────────────────────────┘ │
│  │    │ 1453  The assault breaks…  │        │  OR CHOOSE FROM THE CATALOGUE │
│  │    │       [pol] ◉ pl 0.86      │        │  -48 · Mediterranean · know… │
│  │    │ 1453  The chancery conven…│        │  The Library never burns     │
│  │    │ 1454  Grain reprices…      │        │  1433 · East Asia · politics │
│  │  ┌─[II]─ AN EMPIRE ON CREDIT ──┐ │        │  Zheng He's fleets sail on   │
│  │    │ 1457  A Greek press opens │        │  … (12 catalogue entries)     │
└──────────────────────────────────────┘        └──────────────────────────────┘
```

- **Record rail** (left, blue): a continuous 2px line; baseline anchors render as small blue mono ticks interleaved at their years. Unmistakably *record*, not ink: mono type, blue, non-interactive.
- **Thread rail** (red): begins at the POD header (an SVG splice where the red line peels off the blue) and runs the full ledger. Events attach to it.
- **Era openers**: rubricated IM Fell drop cap of the era's roman numeral in thread red + title + year range + pressures line.
- **Event cards**: mono date column · Spectral title · two-line summary · footer of entity chips, lens ticks, `plausibility 0.82` stamp, `◉` convergence glyph (record blue), `disputed` mark with *see critic notes* attached (thread red, 500 weight).
- Virtualized (TanStack Virtual); rails drawn as absolutely-positioned full-height strips so scroll never breaks the line.

Other views generalize the same picture: **V5 Delta** draws the branch tree literally: blue trunk (main line), red threads leaving it at fork years, y = time. **V6 Compare** is two spines sharing one scroll, shared prefix washed in record blue. **V7 Artifact reader** is a full-bleed sheet of `paper-raised` with per-kind typographic templates (newspaper masthead in Fell; letter in Spectral italic; encyclopedia in dense two-column *within the artifact only*; poster goes big). **V4 Dossier** is a ledger table (mono keys, each line linked to its event) above the biography. **V3 Event detail** is the card unfolded: narrative, cause/effect lists (the accessible fallback), artifact shelf, critic notes as an attached review slip.

## 4. Signature element: the red thread

Spend the boldness budget here; everything else stays quiet.

- Hovering **or focusing** an event draws literal red threads to its causal ancestors and descendants: cubic curves bulging left of the cards like slack string pinned to a corkboard (`computeThreadPath` in `lib/thread-geometry.ts`, unit-tested).
- ~300ms draw-on via `stroke-dashoffset`; unrelated events dim to 35% opacity.
- Off-screen relations (virtualization) are shown honestly as directional counts on the card edge (`2 ↑ · 1 ↓` in thread red) rather than threads to nowhere.
- **Non-visual equivalent**: every event's detail page lists causes and effects as plain links; cards carry `aria-description` naming their counts.

## 5. Motion

- **Ink-in**: streamed events materialize with 2px blur→sharp + opacity rise, 250ms, 60ms stagger: writing appearing in a ledger. Only for SSE arrivals, never on initial load.
- **Thread draw-on**: 300ms, as above.
- Nothing else moves without a reason. `prefers-reduced-motion` renders everything instantly (checked via CSS media + `useReducedMotion`).

## 6. Interface copy

Sentence case, active verbs, no filler. Actions keep their name through the flow: *Fork here → Forked*. Errors state what happened and how to fix it, without apologizing. Empty states invite: *"A blank ledger. Choose a moment to diverge."* Stamps read like archival marks: `plausibility 0.82`, `disputed` (*see critic notes* attached), `wildcard`.

## 7. Self-critique against §7.6 (the generic-AI look)

Checked before build; revisited per view with screenshots (log in DESIGN_NOTES.md):

- ~~Warm-cream + terracotta~~ → paper is deliberately cool grey-green; the red is seal-wax, used only semantically. **Risk noted**: the first token draft drifted warm (`#EDEAE0`); corrected to the map-stock green-grey.
- ~~Near-black + acid green~~ → no green accent anywhere; lens hues are muted earth, tick-marks only.
- ~~Broadsheet multi-column pastiche~~ → one spine per view; multi-column exists only *inside* the encyclopedia artifact, where it is diegetic.
- ~~Glassmorphism / purple gradients / emoji~~ → flat paper, 2px radii, hairline rules; glyphs are typographic (◉, ✳, †), no emoji.
- ~~shadcn/Material silhouette~~ → React Aria is headless; all skin is ours. No floating action buttons, no elevation shadows beyond a 1px rule + 2px offset on raised sheets.
- ~~Decorative numbering~~ → era numerals carry order (kept, roman, rubricated); the Atlas catalogue leads with the *year* (information), not "01/02/03".

## 8. Keyboard & accessibility floor (§8)

`j/k` walk events · `enter` open · `f` fork · `l` cycle lens · `/` search the ledger · `b` delta · `c` compare · `e` export · `?` shortcut sheet. Focus visible everywhere (2px thread-red offset ring); all dialogs/menus are React Aria (focus-trapped, labeled); graph/thread visuals all have list fallbacks; AA contrast in both themes; reduced-motion respected. The floor is part of done, not a stretch goal.
