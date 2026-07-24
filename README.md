# Uchronia: Alternate History Engine

**yoo-KROH-nee-uh** · *n.*, coined 1876 as the temporal counterpart of *utopia*: a time that never was.

> **git rebase for history.**

[![CI](https://github.com/vignesh-nagarajan-vn/uchronia/actions/workflows/ci.yml/badge.svg)](https://github.com/vignesh-nagarajan-vn/uchronia/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-1a5fb4.svg)](LICENSE)
[![Node ≥ 22.12](https://img.shields.io/badge/node-%E2%89%A5%2022.12-3c873a.svg)](package.json)

Uchronia is an alternate-history engine. Choose or write a **Point of Divergence**, say *"the Library of Alexandria never burns"*, and watch history re-derive itself era by era. Drill into events, read biographies of people as they exist in this timeline, hold fake primary sources generated from inside the world, fork sub-branches at any event, and compare everything against real history.

**[Read a finished chronicle in your browser →](https://vignesh-nagarajan-vn.github.io/uchronia/)** — the showcase ledger's self-contained export, no install.

![The timeline: the blue record splitting at the POD, the red thread peeling away](docs/media/timeline.png)

<p align="center"><em>Survey by day, Nitrate by night:</em></p>

![The same ledger in the Nitrate (dark) theme](docs/media/timeline-nitrate.png)

## Not a listicle generator

Uchronia is a lightweight causal simulation wearing a literary interface:

- Generation is grounded in **explicit, mutable world-state** (entities, deltas, a causal graph), never in accumulated prose.
- The graph feeds the loop: new eras must extend or close the causal chains of the old, and the skeptical critic judges every claimed cause **by what it actually cites**.
- Every claim is **auditable** back through the graph, and a pure-code **machine validator** (nine rules, including *no posthumous mutation* — the dead stay dead) polices every batch beside the LLM critic.

The prose is the surface. The graph is the truth.

## Features

- **POD studio**: freeform divergence composer plus a curated gallery of twelve starting points, from the Bronze Age Collapse to a Carrington-class storm in 1989.
- **The spine**: a vertical timeline where the Prussian-blue line of the real record visibly splits at your divergence, the red thread of the counterfactual peeling away from it. Search it, filter it by lens, walk it entirely from the keyboard.
- **Red-thread causality**: hover any event and literal red threads draw to its causal ancestors and descendants.
- **Determinism dial**: from *butterfly* (contingency compounds) to *railroad* (geography, demographics, and economics drag history back toward its attractors) — and the critic's plausibility bar moves with it.
- **Convergence detection**: the engine flags moments where your divergent timeline rhymes back into real history, ranked by the divergence's own theatre.
- **Dossiers**: every person, nation, technology, and institution keeps a state ledger; biographies are written from inside the timeline; entities age, die, and dissolve for good.
- **Diegetic artifacts**: newspaper front pages, personal letters, encyclopedia entries, and propaganda posters, typeset as period primary sources.
- **Branching**: fork at any event with an optional sub-POD; compare any two branches, or a branch against the real record. Don't like an event? *Tell it again* — regenerated in place, validated before it lands.
- **Export**: full JSON, markdown, and a self-contained static HTML edition of any branch — typefaces embedded, readable decades from now.

| | |
| --- | --- |
| ![The Atlas: composer and catalogue](docs/media/atlas.png) | ![The delta: red threads leaving the blue trunk](docs/media/delta.png) |
| ![An event unfolded: causes, artifacts, critique](docs/media/event-detail.png) | ![Two branches aligned for comparison](docs/media/compare.png) |
| ![A diegetic letter from inside the timeline](docs/media/artifact-letter.png) | |

## Quickstart

Requires Node ≥ 22.12 and pnpm (`corepack enable pnpm`).

```sh
pnpm install

# Without an API key — the full product on the deterministic mock engine,
# with pacing on so you can watch history ink in (works on every OS):
pnpm dev:mock

# With a key (live generation):
cp .env.example .env   # put ANTHROPIC_API_KEY in .env (server-side only)
pnpm dev
```

Web app: http://localhost:5173 · API: http://localhost:8787

Everything in the UI is reachable in mock mode; CI runs exclusively keyless. On the empty atlas, click **load the showcase chronicle** for an instant 67-event, two-branch Alexandria timeline with disputes, convergences, and artifacts.

Prefer a container? `docker build -t uchronia . && docker run -p 8787:8787 -v uchronia-data:/data uchronia` — one port, keyless, safe to host. See [docs/DEPLOY.md](docs/DEPLOY.md).

<details>
<summary><strong>Troubleshooting</strong></summary>

- **`corepack enable pnpm` fails on Windows** — run the terminal elevated once, or `npm i -g corepack@latest` first (older corepack signatures expired).
- **`UCHRONIA_MOCK=1 pnpm dev` errors in PowerShell** — that's POSIX syntax; use `pnpm dev:mock`, which is cross-platform (or `$env:UCHRONIA_MOCK='1'; pnpm dev`).
- **better-sqlite3 build errors** — it ships prebuilt N-API binaries for Node 22/24 on all three OSes; `pnpm install` again after upgrading Node rather than mixing versions.
- **Port taken** — `UCHRONIA_PORT` moves the API; the web dev server proxies `/api` to 8787 by default.

</details>

## Architecture

```mermaid
flowchart LR
    subgraph web [apps/web · Vite + React]
        UI[RED THREAD interface]
    end
    subgraph server [apps/server · Hono]
        API[routes + SSE]
        DB[(SQLite · Drizzle)]
        ANTH[AnthropicProvider]
    end
    subgraph core [packages/core · pure engine]
        PIPE[generation pipeline]
        STORE[world-state store]
        VAL[machine validator]
        MOCK[MockProvider]
    end
    SCH[packages/schemas · Zod]

    UI -->|fetch / SSE| API
    API --> PIPE
    PIPE --> STORE
    PIPE --> VAL
    PIPE -->|LLMProvider port| ANTH
    PIPE -->|LLMProvider port| MOCK
    API --> DB
    core --> SCH
    server --> SCH
    web --> SCH
```

## Documentation

The engine is specified, not just implemented: [ARCHITECTURE](docs/ARCHITECTURE.md) (system map, ports, error taxonomy) · [DATA_MODEL](docs/DATA_MODEL.md) (schemas, fork semantics, the validator) · [GENERATION](docs/GENERATION.md) (pipeline stages, prompt registry, dial mapping, dual review) · [DESIGN](docs/DESIGN.md) (the binding RED THREAD spec) · [DEPLOY](docs/DEPLOY.md) (Pages demo, Docker, live-mode rules) · [TESTING](docs/TESTING.md) · [ROADMAP](docs/ROADMAP.md) (honest status, open threads) · [CONTRIBUTING](CONTRIBUTING.md) · decision records in [docs/adr](docs/adr/).

## Philosophy

1. **State-grounded generation.** Events mutate explicit entity state via recorded deltas; new generation conditions on the current state snapshot, never on prose. Consistency is enforced by the data model, not hoped for.
2. **Ripple propagation.** Consequences radiate in waves: disciplined near the divergence — any divergence, including a fork's — freer decades out.
3. **Determinism dial and convergence.** Contingency versus structural attractors is a user-facing control, and the moments where the counterfactual rhymes back into real history are surfaced as first-class marks.
4. **Dual review.** A machine validator that cannot be argued with, and a skeptical historian-critic that flags anachronism, teleology, great-man overreach, presentism, and cliché collapse. What fails is regenerated; what persists in failing is kept but visibly marked *disputed*.
5. **Lazy generation.** Skeleton first, depth on demand. Nothing dense is generated unread.
6. **Anti-cliché mandates.** Consequences must span structural, cultural, economic, and mundane registers (prices, fashions, slang), not just wars and treaties.

## A note on sensitive history

Alternate history touches real atrocity and real grief. Every generation prompt embeds a sober, historiographic register; counterfactuals involving mass suffering are treated with the gravity of the real events they mirror, and the critic treats tonal violations as failures.

**Uchronia's outputs are speculative fiction produced by a language model: a thinking toy, not scholarship, and not a source.**

## License

[MIT](LICENSE) © 2026 Vignesh Nagarajan
