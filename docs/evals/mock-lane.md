# Mock eval lane: demo intake benchmark

Deterministic structural assertions over 31 benchmark PODs (packages/evals/src/bench.ts), run keyless against the demo engine. Regenerate with `pnpm --filter @uchronia/evals eval:report`. Scores only; no prompts or responses.

| POD | Tags | Year | Region | Mechanism | Confidence | Result |
| --- | --- | --- | --- | --- | --- | --- |
| allies-lose-ww2 | modern, ww2, headline | 1940 | Europe | politics | 0.85 | pass |
| axis-wins-wwii | modern, ww2 | 1940 | Europe | politics | 0.85 | pass |
| ww2-never-happens | modern, ww2 | 1940 | Europe | politics | 0.85 | pass |
| sea-lion | modern, ww2 | 1940 | Europe | politics | 0.82 | pass |
| pearl-harbor-averted | modern, ww2, pacific | 1941 | East Asia | politics | 0.80 | pass |
| dday-fails | modern, ww2 | 1944 | Europe | politics | 0.82 | pass |
| no-october-revolution | modern | 1917 | Europe | politics | 0.82 | pass |
| cold-war-hot | modern | 1948 | the wider world | politics | 0.85 | pass |
| apollo-continues | modern | 1969 | North America | technology | 0.80 | pass |
| alexandria-unburnt | ancient | -48 | Mediterranean | knowledge | 0.62 | pass |
| caesar-survives | ancient | -44 | Mediterranean | politics | 0.82 | pass |
| actium-reversed | ancient | -31 | Mediterranean | politics | 0.82 | pass |
| rome-stands | ancient | 476 | Mediterranean | politics | 0.82 | pass |
| bronze-age-holds | ancient | -1177 | Mediterranean | politics | 0.82 | pass |
| constantinople-holds | medieval | 1453 | Mediterranean | politics | 0.82 | pass |
| mongols-take-europe | medieval | 1242 | Europe | culture | 0.82 | pass |
| black-death-averted | medieval | 1347 | Europe | disease | 0.80 | pass |
| press-suppressed | medieval | 1455 | Europe | knowledge | 0.82 | pass |
| armada-lands | early-modern | 1588 | Europe | politics | 0.82 | pass |
| treasure-fleets-sail | early-modern | 1433 | East Asia | technology | 0.82 | pass |
| french-revolution-fails | early-modern | 1789 | Europe | politics | 0.85 | pass |
| taiping-succeeds | obscure | 1864 | East Asia | politics | 0.82 | pass |
| carrington-1989 | obscure | 1989 | Europe | environment | 0.82 | pass |
| haber-fails | obscure | 1909 | Europe | technology | 0.82 | pass |
| vague-plague | vague | 541 | Mediterranean | disease | 0.62 | pass |
| vague-progress | vague | 762 | Middle East | politics | 0.30 | pass |
| garbage-keysmash | garbage | 1900 | the wider world | politics | 0.30 | pass |
| garbage-repeat | garbage | 1900 | the wider world | politics | 0.30 | pass |
| garbage-emoji-digits | garbage | 1900 | the wider world | politics | 0.30 | pass |
| german-konstantinopel | non-english | 1453 | Mediterranean | politics | 0.82 | pass |
| spanish-armada | non-english | 1588 | Europe | politics | 0.82 | pass |

31/31 passing.
