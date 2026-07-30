# Roadmap: living milestone status

Mirrors §13 of the master prompt ([MASTER_PROMPT reference](../CLAUDE.md)). Updated at every milestone with honest status. Every milestone exits with: tests green locally and in CI · docs synced (including CLAUDE.md) · this file updated · commits pushed.

| Milestone | Status | Notes |
| --- | --- | --- |
| M0: Foundation | ✅ 2026-07-22 | Workspace, CI, Vitest wired (17 tests green), docs skeletons, CLAUDE.md v1, ADR-0001 |
| M1: Schemas & engine store | ✅ 2026-07-22 | Full §3 schema set + fixture world; World store with normalized structural-sharing forks, state replay, pre-fork guards; validator v1 (8 rules, each tested); 58 tests green |
| M2: Persistence & API skeleton | ✅ 2026-07-22 | Drizzle schema + committed migrations, Repo layer, LLMProvider port + structured repair loop, deterministic MockProvider (pod intake works for arbitrary text), CRUD/import/export/branch-view routes; 81 tests green |
| M3: Generation v1 | ✅ 2026-07-22 | Seed pipeline (drafts→resolution→clone-validation→commit), dial mapping, AnthropicProvider (structured outputs via output_config.format, streaming, typed errors), SSE generate route with persist-before-stream and clean abort; mock parity incl. flavor banks; 96 tests green |
| M4: Critic & validation loop | ✅ 2026-07-22 | refineBatch dual review: clone-validated machine rules + critic rubric, bounded regeneration, drop vs dispute sentencing, wildcard plausibility floor, CritiqueReports persisted + streamed; retry/dispute/drop paths each tested |
| M5: Era engine | ✅ 2026-07-22 | Fibonacci era plan with resume-by-ordinal, pressures step (+ dial attractor pull), era-generate, convergence scan against the record; baseline.json authored (203 curated anchors); mock demo paths (revise at era 1, dispute at era 2); 106 tests green |
| M6: Lazy expansion | ✅ 2026-07-22 | Event detail (state-at-event conditioning), era deep-dives, branch-local biographies with fill-once semantics incl. shared pre-fork fills; routes + persistence; lens tagging was already first-class at generation (M3). 120 tests green |
| M7: Branching | ✅ 2026-07-22 | Fork endpoint with sub-POD normalization; child era plans from the fork year; compare endpoint (branch↔branch with shared-prefix/divergence-point, branch↔baseline); invisible-slug collision renaming in draft resolution; multi-level fork tests (grandchild) green end to end |
| M8: Artifacts | ✅ 2026-07-22 | Four diegetic generators with per-kind schemas and period-aware mock content (era-bucketed mastheads, notices, in-world encyclopedia voice); (event, kind)-stable documents; route + persistence; 133 tests green |
| M9: Web foundation | ✅ 2026-07-22 | DESIGN.md finalized first; RED THREAD tokens (Survey + Nitrate), fonts self-hosted; Atlas (composer + 12-entry catalogue + open ledgers); Timeline v1: virtualized spine, POD split, record rail, streaming ink-in; screenshot review logged in DESIGN_NOTES |
| M10: Web depth | ✅ 2026-07-22 | Event detail, dossiers, lens filters, red-thread hover layer (with honest off-screen counts), Delta tree, Compare (branch/branch + branch/record), Artifact reader (4 typographic templates), keyboard map, a11y floor (fieldsets, list fallbacks, reduced motion, AA both themes); Playwright journey green |
| M11: Export & polish | ✅ 2026-07-22 | Markdown + self-contained static HTML branch exports (design language inlined, no JS), JSON import via Settings, empty/error states, reduced-motion audit |
| M12: Ship v0.1.0 | ✅ 2026-07-22 | Demo timeline committed (demo/the-unburnt-library.uchronia.json: 67 events, 2 branches, disputes, convergences, artifacts); README with real captures; docs audit; CLAUDE.md truth pass; tag v0.1.0 |

## The 0.2 hardening series (2026-07-23)

A ~15-commit pass over the whole stack, from a full audit of v0.1.0. Highlights, all landed:

- **Engine thesis deepened**: the causal graph now feeds generation (parents in prompts, resolved causes for the critic, carried pressures); convergence is region-aware; entities have a lifecycle (terminal deltas + a ninth validator rule); the critic calibrates to the dial; forks open disciplined from their own divergence; state snapshots are recency-budgeted.
- **Corruption-proofing**: per-branch generation lock + unique `(branch_id, ordinal)` index; semantic import validation (422); partial-era healing on resume; non-fatal convergence scan.
- **Live-mode readiness**: AbortSignal to the provider's HTTP layer, one doubled-budget retry on truncation, per-run token accounting with a hard ceiling (`UCHRONIA_MAX_RUN_TOKENS`), and the provider unit-tested via an injectable client. (Still not exercised against the real API from this machine; that caveat stands.)
- **API completeness**: PATCH timeline (rename/dial/horizon-extend), regenerate-event-in-place, DELETE leaf branches, `rootBranchId` in summaries.
- **Web**: route code-splitting (the ~674 kB warning is gone), Stop button + unmount abort, search + multi-lens, prev/next walking, real j/k focus, themed burn/rename dialogs, error boundary + 404, live-region announcements, one-click showcase loading.
- **Packaging & presentation**: CI matrix (ubuntu/windows × node 22/24), Dockerfile, CHANGELOG/CONTRIBUTING/SECURITY, `pnpm dev:mock` (the POSIX-only incantation is dead), mock pacing + variety, font-embedded HTML export.

## The deployment-hardening pass (2026-07-26)

A full line-by-line audit (five parallel reviewers over packages, server, web, repo config, and docs) triggered by Vercel deployments failing on GitHub import. Landed:

- **The Vercel chain rebuilt on certainty**: the function is now a prebundled plain-ESM file (`apps/server/dist/vercel.js`, showcase chronicle and baseline inlined, migrations + export fonts staged beside it) behind a two-line `api/index.mjs` - Vercel's builder no longer compiles workspace TypeScript, which was the structural failure. Install pins pnpm without corepack; the Node floor rose to 22.13 (pnpm 11.16's own requirement); `includeFiles` is one brace-free glob.
- **Proof, not hope**: `pnpm verify:vercel` stages the function exactly as Vercel ships it and drives it with real requests under plain Node; CI's new `vercel-shape` job runs it on ubuntu. The harness immediately caught a latent bundle crash (duplicate `createRequire` from the esbuild banner) that had never surfaced because no built bundle had ever been executed.
- **Live-mode landmine defused**: the default generation model moved to `claude-sonnet-5` - the old default (`claude-sonnet-4-6`) does not support the structured outputs the provider sends on every call, so the first real live request would have 400'd.
- **Config honesty**: empty env vars now mean "unset" (an empty `UCHRONIA_MAX_RUN_TOKENS=` no longer disabled the spend ceiling; an empty `UCHRONIA_SEED_DEMO=` no longer blanked the Vercel demo), the DB redirects to `/tmp` on any Lambda-shaped runtime even without `VERCEL`, the server binds `127.0.0.1` by default (`UCHRONIA_HOST`; the container sets `0.0.0.0`), and the documented `.env` flow actually loads.
- **A dozen audit bugs fixed** across core (em-dash scrubber emptying validated fields, store-guard exceptions escaping the review loop, batch-local slug collisions, a double-run validator rule, unbounded critic fan-out), server (malformed JSON → 400 not 500, compare 404s, SSE anti-buffering header), and web (severed streams no longer masquerade as completed runs, CRLF-tolerant SSE parsing, reader cleanup, theme/settings/atlas guards, download-not-navigate export, colliding React keys).
- **Confirmed live (2026-07-26)**: the GitHub import deployed after four real-world corrections - Vercel's path-to-regexp validator rejects nested groups in rewrite sources; the project carried a stale `apps/server` Root Directory; the Node runtime invokes the function `(req, res)`-style, so the fetch-shaped `hono/vercel` handler hung every request to a 504; and the runtime's helpers pre-consume request bodies, so any stream-reading adapter hung every POST. The entry now bridges `(req, res)` to the app itself, rebuilding bodies from the helper buffer, and the harness pins both contracts through a real `node:http` server. The playground runs at <https://uchronia-server.vercel.app/> - POD creation, branch views, SSE derivation, and exports all verified against the deployed instance.

Released as **v1.0.0** (2026-07-26), the first stable cut: engine, interface, deployment chain, and the live playground all verified.

## v2.0.0: The Second Derivation (program opened 2026-07-29)

v2 exists because of a relevance failure: a user asked "What if the Allies lost World War 2" and the silent mock fallback served a canned history set in the 1600s (the mock's year regex read "2" as a year, found nothing, and rolled a random century). The release's north star: **the engine answers the question asked, provably.** The headline acceptance test (the WW2 gate): that prompt must produce, in live mode, an interpretation card offering real WW2 divergence mechanisms and a derived history that stays on subject (eval-scored, relevance mean >= 4.0 with no benchmark POD below 3), and in demo mode a POD snapped to 1939-1945 with an unmissable banner explaining that demo content is canned. If the WW2 gate does not pass, v2.0.0 does not ship.

Ground rules for the program: milestone order M13-M25 with all gates green at every boundary; the app releasable at every boundary; mock parity and keyless CI/e2e forever; secrets never in the repo (the scan is CI-enforced); build-time API spend tracked and reported here at release; docs synced in the same commit series as every change.

| Milestone | Status | Scope (planned) |
| --- | --- | --- |
| M13: Honest modes and live foundations | done 2026-07-29 (live smoke deferred per ADR-0004) | Landed: mode field + DEMO pill + composer banner (amber notice register, both themes), Settings v2 with guided go-live steps, POST /api/live-check (1-token proof, injectable, route-tested), per-model usage accounting + run.usage SSE frames + dated pricing table in core (cache tiers included ahead of M24), secret scan in CI, e2e demo-honesty spec, in-process dev:preview launch. The first real live derivation happens on the deployed instance (owner sets the key in Vercel; ADR-0004) |
| M14: POD Intake 2.0 | done 2026-07-29 (live half of the WW2 gate deferred per ADR-0004) | The relevance fix, landed: `pod-interpret` (generation tier) grounded on retrieved anchors returns reading + confidence + ambiguities + 2-4 real candidate mechanisms + at most one clarifying question; `POST /api/timelines/interpret` creates nothing and creation accepts the confirmed reading (`provenance: user`); interpretation card in the composer (chips, editable fields, Just-derive escape). Relevance guard: on-divergence mandates in seed/era prompts, on-divergence critic dimension with fixture coverage, `batchReachesPod` drift tripwire. Mock 2.0: the year regex and random-century fallback are dead; named-event aliases (WW2 offers Sea Lion / Moscow / Pearl Harbor / the German bomb), anchor snapping, twentieth-century flavor banks. Demo WW2 gate verified in unit, route, browser, and e2e |
| M15: Quality machinery | done 2026-07-29 (live measurements deferred per ADR-0004) | packages/evals: 31-POD benchmark, mock lane in CI + pnpm test (31/31; committed report in docs/evals/mock-lane.md; the harness caught three real intake bugs while being built), judged live lane + critic A/B built, key-gated, budget-capped (measurements pending a key; Haiku stays the critic default until data says otherwise; thresholds in docs/EVALS.md). Engine Room: onTrace sink in the structured boundary, run_traces table + pruning (UCHRONIA_TRACE_RUNS), trace routes, per-branch inspector view with prompt/response panes and per-call cost. Validator: tech-prerequisite DAG with effective floors (rule 10), demographic person-span (rule 11), geographic advisory (warning-grade, keyword-inferred). Fuzzing: fast-check over demo intake (never throws, schema-valid) and imports (4xx envelopes, no partial writes) |
| M16: Baseline 2.0 and the POD gallery | done 2026-07-30 | The curated spine grows 203 -> **1578** anchors (4000 BC to 2024, 54 centuries, 367 in the twentieth), authored in 15 disjoint year-range batches and assembled by `scripts/build-baseline.mjs`, which enforces field types, the 11-value region taxonomy, the lens vocabulary, id and title+year uniqueness, summary length, and the em-dash ban, and writes nothing if one anchor is malformed. Anchor schema v2: regions[], tags[], magnitude 1-5, attractorStrength 0-1. A 72-anchor fact-check sample with an adversarial refutation pass flagged 18 and confirmed 8, all applied (Thales retitled to "credited with", Westphalia dropped the sovereignty myth, Wagadu lost a three-century-early gold trade, the Cultural Revolution states its human cost). Densifying the baseline broke retrieval twice and both were fixed properly: `corpusSpecificity` (document frequency over anchor titles) replaces word length, so a seven-letter preposition no longer outranks a four-letter proper noun; and a named event in the ask now fixes the year instead of yielding to a retrieval guess. Ties break toward magnitude. Convergence reads attractorStrength (12 hints, strongest 5). The record room at /record; 85 gallery entries with curated intake hints |
| M17: Symposium and the Court | done 2026-07-30 | Symposium derivation (opt-in, ~4x tokens): `chooseSpecialists` seats three chairs by pressure intensity (the military chair has no kind of its own and instead takes half the weight of every pressure at or above 0.6), the specialists fan out in parallel, and `era-synthesize` merges them, keeping genuine disagreements as `contested` marks with marginalia rather than smoothing them away. The Court of Plausibility (opt-in, at most 3 cases per era): advocate and skeptic brief in parallel on the critic tier, a judge rules once on the generation tier; uphold clears the dispute, revise orders one clone-validated retelling that falls back to the dispute if it breaks graph rules, dispute keeps the mark with the transcript attached. Dial axes (great persons, technology, culture, chaos) derive from the master dial until moved, and now claim WHOLE wildcard slots because fractional boosts rounded away to nothing across most of the range. Persisted (`court_records`, `events.contested`), streamed (`court.completed`), and rendered (colourless `[contested]` marginalia, the court transcript in event detail, the axes flyout). Mock parity fixed along the way: the demo synthesizer was draining each chair's opening events, which left the era's later years empty and hid its shakiest material from the critic, so the demo could never show the symposium and the court together |
| M18: Lives, deep time, convergence, language | done 2026-07-30 | Lives: entities carry `bornYear`, `counterfactual` (this history invented them, and the reader is told), and `succeedsSlug`; role tenures are replay-derived from the `role` key of visible deltas, never stored, so a sibling branch still shows the old holder. Deep time: `defaultHorizonYears` carries a divergence to the present by default, and era spans keep widening past the width table instead of repeating, so five thousand years costs a bounded number of eras; an optional epilogue adds one openly speculative era past the horizon, hatched and labelled non-historical wherever it renders. Convergence 2.0: matches name the attractor that pulled and how the road differed, and lateness is computed as arithmetic by the pipeline rather than asserted by the model. Claims (new type, bound to the event that asserted them, so a fork cannot inherit one made after its cut): coarse regional indices that the pressures step reads, and name drift surfaced through the new philology lens. Validator rule 12 polices the indices, judging the ACTUAL movement rather than the reported delta, since `delta` is exactly where an understated jump would hide |
| M19: Branch algebra and probes | done 2026-07-30 | The counterfactual pulse (one call, nothing committed, and the fork it proposes opens already worded). The graft: one event plus its direct consequences onto a leaf branch, with an event whose actors the target never met refused by name and a consequence whose actors it never met simply left behind. Hard conflicts (dangling edges, deltas that will not apply, posthumous mutation) always refuse; era overlap is soft, because a branch carrying material dated inside history it already wrote is the honest picture. Soft conflicts come back unapplied, then land visibly disputed under force. Cross-branch entity fates, and a third column in compare |
| M20: The literary surface | done 2026-07-30 | Four new artifact kinds chosen because each is stuck with a register the longer forms let a writer escape: telegram, broadcast transcript, obituary, classified page, each with a schema, prompt, demo handler, and renderer. Procedural heraldry from an entity slug (FNV-1a, the real tincture rule enforced, served from /api/arms because web cannot import core). In-world historiography: two or three rival schools per branch with the blind spot their rivals name, and an event read through all of them in one call. NOT BUILT: the Encyclopaedia Uchronica as its own route (the encyclopedia artifact kind covers the entries) |
| M21: The Book and publishing | done 2026-07-30 | Commission a branch into a frontispiece, a chapter per era, artifacts set as plates, and appendices for lives, convergences, and the index. Print-grade self-contained HTML and a hand-packaged EPUB 3, tested against the format's own rules (stored mimetype first, spine to manifest to files) rather than against our serializer agreeing with itself. Lens and plate-density options at commission time. NOT BUILT: the site-bundle zip and the GitHub Pages walkthrough (the static export already is a single self-contained file) |
| M22: Maps, motion, comparison, navigation | done 2026-07-30 | region-control claims, and a stylized map on the baseline's own eleven-region taxonomy, drawn coarsely and captioned as a diagram rather than a map, with a data table that is always rendered and carries the same claims. The command palette (Ctrl+K), route-aware so it works on an event or a dossier and not only on the ledger. NOT BUILT: the Chronoscope play mode, the Atlas fork constellation, and the compare heat strip; all three are presentation over data that already exists and none is load-bearing |
| M23: Interrogation | done 2026-07-30 | One shared retrieval pass behind both modes, every citable row pinned to something the app can open, and only the pins the answer used returned. Ask the Archivist answers from the record and persists nothing. The Grand Inquiry returns a verdict, a cited causal chain, required counter-considerations, and a confidence about the record rather than the prose, saved to the shelf as an `inquiry` artifact and rendered in the app's own register so nobody reads it as a period source. NOT BUILT: SSE streaming and per-branch conversation history (the citation contract was the part that had to be right) |
| M24: Platform and live ops | done 2026-07-30 | ADR-0005 supersedes ADR-0003. On serverless a key with no UCHRONIA_ACCESS_TOKEN is REFUSED: demo mode is forced and the key is dropped from the resolved config, because the alternative default fails toward an invoice. A constant-time passphrase in an httpOnly cookie, a per-IP fixed window, and a UTC-day token ledger charged as a run spends. Only provider-reaching routes are gated. Prompt caching on the system prefix. DEPLOY.md rewritten with the exact variable list and the in-memory caveat stated plainly. NOT BUILT: parallel expander fan-out, resumable-run snapshots, undo-burn |
| M25: Onboarding, showcases, release | done 2026-07-30 | Three showcase chronicles beside the original (an Alexandria carried 220 years with an epilogue, an Armada derived by symposium with the court sitting, and the Allies losing), all demo-derived per ADR-0004 and offered on a first visit, seeded on a fresh deployment, and inlined into the serverless bundle. Version 2.0.0, CHANGELOG, README overhaul, docs sweep, the ADR log complete. NOT BUILT: the 60-second spotlight tour |

### The v2.0.0 record, honestly

**Shipped 2026-07-30.** All thirteen milestones M13 through M25 are complete.
Test matrix at release: schemas 15, core 182, web 13, evals 2, server 121
(333 in all), 5 e2e specs, 31/31 on the mock eval lane, 8/8 on the Vercel
shape check, secret scan clean.

**The WW2 gate, demo half: PASSES.** "What if the Allies lost World War 2"
produces an interpretation card offering Operation Sea Lion, Moscow 1941, no
Pearl Harbor, and a German bomb, at a year inside 1939-1945, and the derived
chronicle in `demo/the-allies-lose.uchronia.json` runs 1940 to 2024 on
subject. Covered by unit, route, and e2e tests.

**The WW2 gate, live half: DEFERRED to the deployment, per ADR-0004.** No
`ANTHROPIC_API_KEY` was ever placed in this tree. Every live path is
unit-tested against injected stubs and gated in CI on the demo side; the live
eval lane (`pnpm eval:live`, thresholds in docs/EVALS.md) is built,
budget-capped, and one command from running on a machine that has a key.

**Build-time API spend for the entire v2 program: zero.** Everything above was
derived, tested, and shipped on the deterministic demo engine.

**Not built, by explicit choice.** Each was scoped out with the reason recorded
in its milestone row and its commit message: the Chronoscope play mode, the
Atlas fork constellation, the compare heat strip, the Encyclopaedia Uchronica
as its own route, the site-bundle zip, SSE streaming and stored conversations
for the archivist, parallel expander fan-out, resumable-run snapshots and
undo-burn, and the 60-second onboarding tour. None of them is load-bearing for
the release; several are presentation over data the app already holds.

**Known limitation carried forward.** The M24 rate limiter and daily token
ledger are in-memory and per instance, so a cold start resets them and warm
instances count separately. They brake casual abuse; the layer that bounds the
loss is the spend limit on the Anthropic account, which the owner sets.

**Three bugs the work found in itself,** each fixed at the root rather than
patched: retrieval was using word length as a proxy for specificity (so a
seven-letter preposition outranked a four-letter proper noun); the demo
symposium was draining each chair's opening events, which hid the era's
shakiest material from the critic and made it impossible to demonstrate the
symposium and the court together; and `Number(null)` is 0, not NaN, which was
silently suppressing every plate in a commissioned book.

Build-time API spend so far: none (no key present yet; all work to date is mock-side).

## M26: the public-live posture (2026-07-30, post-release)

Not part of the M13-M25 program. It came out of the deployment being turned on:
the owner set `ANTHROPIC_API_KEY` and `UCHRONIA_ACCESS_TOKEN` on Vercel, and
every visitor, including the owner in a fresh browser, met a 401 at the first
click. ADR-0005 could express "the key is mine, behind a passphrase" and had no
way to express "the key is the public's, metered", so it treated the second
intent as the first.

**Shipped.** `UCHRONIA_PUBLIC_LIVE=1` as an explicit third posture (never
inferred); a per-visitor UTC-day ledger keyed by forwarded IP; a per-run ceiling
that defaults down to one visitor's allowance; the passphrase demoted from door
to override where both are set; the posture stated in the composer and Settings
before the first click rather than as the error answering it. ADR-0006 records
the reasoning and the cost exposure. 11 new tests in `gate.test.ts`.

**Two findings worth more than the feature.** First, metering was charging only
`/generate`: `interpret`, `expand`, `biography`, `regenerate`, `artifacts`,
`pulse`, `interpretations`, `schools`, `ask`, `inquiry` and `fork` all reach the
provider and none of them touched the day's ledger. Correct enough on a
passphrase instance where the only caller was the owner, a real hole the moment
visitors could spend. The charge moved into a wrapper around
`LLMProvider.complete`, which is the one place every route funnels through.
Second, `isUnlocked` returns true whenever no passphrase is configured, so
reusing it to decide "is this caller a visitor" metered nobody on precisely the
instance that needed metering. The test suite caught this before it shipped;
`isOwner` is now a separate question with a comment saying why.

**NOT BUILT:** durable cross-instance ledgers. The limitation from ADR-0005
carries over and matters more now (in-memory, per warm instance, so the
effective cap is the configured one times the instance count). The layer that
actually bounds the loss stays the provider-side account spend limit, which
DEPLOY.md now tells the operator to set before enabling the posture.

## Open threads

- Live-mode generation is wired, provider-unit-tested, and cost-capped, but still has not been exercised against the real API from this machine (no key present); mock parity is the tested path. First run with a key should start with one small timeline. (The structured-outputs model landmine above is fixed, which removes the known first-call blocker.) **M26 makes the deployment the place this gets exercised**: with the public posture on, the first real derivations will happen there, and the Engine Room plus the cost meter are the instruments for reading them.
- M26's per-visitor metering is per IP, with everything that implies (shared NATs undercount, a rotating client evades). Accepted per ADR-0006 as a brake on casual abuse; revisit only if the deployment sees real abuse rather than in anticipation of it.
- Per user direction on 2026-07-22, M9–M12 landed as a small number of consolidated commits instead of §11.1's 5–15-per-milestone grain (process deviation, not architectural; recorded here in lieu of an ADR).
- Delta view lines run fork→horizon rather than fork→last-event (branch last-event years aren't in the compare-side payloads); honest but slightly generous.
- Deferred deliberately from the 0.2 series: user-authored events/entities (Provenance already models `kind: 'user'`), tombstone deletion of single events (dense ordinals make it structural), import-as-copy on id conflict (server-side id remapping), CompareView row virtualization, PNG/SVG export of the spine, soft-delete undo for burns, and a real sub-768px mobile layout beyond the wrap/height pass.
- The playground's state is per-instance and reset by every redeploy; visitor chronicles evaporate by design (the UI now says so at the dead end). Making them durable means a hosted SQLite (Turso/libSQL) and therefore an async repo layer: the whole Repo/routes surface is synchronous better-sqlite3 today. Recorded as the known path if the playground should ever keep what visitors make.
- Noted for later (from the audit, deliberately unfixed): perf/a11y polish in the web app (manualChunks pulling shared React modules into the `aria` chunk, `useBranchView` dragging the timeline chunk into leaf views, whole-d3 import for one scale, DeltaView compare checkboxes unreachable from the SVG's list fallback, a `useConfig` hook to unify query options), Era headers fall back to Arabic numerals past XIV, and the pressures step runs on the critic-tier model by design - flagged in case it deserves the generation model.
- Push access verified 2026-07-22 via Windows Credential Manager (`git:https://github.com`); milestone-boundary pushes are unblocked.
