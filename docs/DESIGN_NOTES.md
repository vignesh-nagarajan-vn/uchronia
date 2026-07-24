# Design notes: tried and rejected

Running log (§7.8). Newest first.

- *2026-07-23 · the 0.2 interaction pass.*
  - **Burn confirmation** replaced `window.confirm` with a React Aria alertdialog restating what burns (title, counts) and offering "export first" inside the dialog: the escape hatch lives where the danger is. Undo/soft-delete was considered and deferred: a wrong burn is recoverable via export-first or the demo JSON, and a tombstone table is real schema weight.
  - **Compare checkbox recolored** from thread red to neutral ink: selection is UI state, not divergence, and the red reservation is absolute. (The one violation found in the audit.)
  - **j/k unified with DOM focus.** The visual ring previously tracked a separate index from real focus: two focus models, screen readers heard nothing. Now the walk moves actual focus to the card's title link; `focus-within` renders the same ring. Rejected a roving-tabindex rebuild as overkill for a list whose cards are single links.
  - **Stop control** sits beside the "deriving…" stamp in the same quiet border style as `+100y`: interruption is a normal act, not an alarm; thread red stays on the act of derivation itself.
  - **Search** is a plain `type=search` input at the toolbar's lens end, mono placeholder, `/` to focus. Rejected a modal command-palette: the ledger is one list; filtering it in place keeps the spine visible.
  - **Event cards** gained the stretched-link pattern (whole card clicks, inner entity links raised): the hover affordance finally matches the hit area. Intra-card focus moves no longer flicker the thread overlay (boundary-crossing check).
  - **Prev/next in event detail** as a quiet mono rail above the title, with terminal phrases ("the divergence is the beginning" / "the horizon, for now") instead of disabled arrows: dead ends should say where you are.
- *2026-07-22 · screenshot review, all views (mock, Survey + Nitrate).* Atlas / Timeline / Delta / Detail / Compare / Artifact reader captured and reviewed against §7.6:
  - **Timeline** reads as the thesis: blue record rail splitting at the POD header, red thread rail peeling off, record ticks in blue mono interleaved by year, rubricated Fell drop caps. Kept.
  - **Record ticks** were first drafted right-aligned against the blue rail with negative margins; the alignment fought the virtualizer. Rejected in favor of ticks flowing in the content column with the date column shared with events: alignment by sort order, not pixel math.
  - **Delta**: first tried d3 tidy-tree (top-down). Rejected: a downward tree reads as an org chart, not a history. Replaced with year-scaled vertical lines: blue trunk, red child threads leaving at fork years, plus an accessible list fallback. The child "compare" checkbox label can kiss the curve at tight fork angles. Acceptable; revisit if trees get dense.
  - **Compare**: shared-prefix rows washed in `record-wash` with a small `shared` stamp beat an earlier idea of collapsing shared rows entirely (history you can't see isn't history).
  - **Mock content nit** caught on the compare shot: the critic-repair replacement left a lowercase sentence opener. Fixed at the source (mock repair capitalizes).
  - **Fell for the "against"** in compare headers: one word of ceremony, 28px, within the ≥24px rule.
- *2026-07-22 · tokens.* First token draft drifted warm (`#EDEAE0` paper). Rejected against §7.6's cream ban; re-anchored on the survey-map green-grey `#E8EAE3`. Dark-theme record blue lightened to `#7FA9D9` after a contrast check (7:1); the light-theme `#174A7C` fails on `#0F1420`.
- *2026-07-22 · lens recoloring.* First instinct: tint whole event cards by lens. Rejected: color must keep meaning (red/blue are reserved; five tinted card families would out-shout both). Landed on 3px earth-tone tick-marks only.
- *2026-07-22 · M0–M8.* No UI existed by design: DESIGN.md gated the first UI commit.
