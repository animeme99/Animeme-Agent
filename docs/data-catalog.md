# Animeme Public Data Catalog

This repo exposes agent skills over the public Animeme API surface.
Everything is read-only and advisory.

## First-Run Commands

- `npm run doctor`: checks Node version and public ANIMEME API reachability.
  It also reports whether `GMGN_API_KEY` is configured for complete token
  analysis and whether Binance public APIs are reachable without printing any
  secret.
- `npm run demo`: loads the easiest first-run public context bundle.
- `npm run brief`: daily context bundle across Now Attention, Spotlight, and
  Narrative Learning.
- `npm run context`: same full public bundle when an agent wants to refresh
  its working context.

## Live Attention

- `GET /api/now-attention-feed?modes=rising,latest,viral`
- Use for current Attention Reads, new topics, viral topics, topic token
  lists, and scan artifacts.
- CLI: `npm run demo`, `npm run brief`, `npm run scan`, `npm run hot`,
  `npm run new`

## Attention Spotlight

- `GET /api/spotlight?limit=15&historyLimit=30`
- `GET /api/spotlight-topic-signals?topicIds=<topic-id>`
- `GET /api/spotlight-performance-notifications`
- Use for canonical Spotlight cards, first-signal context, recent milestone
  alerts, and topic-level performance history.
- CLI: `npm run demo`, `npm run brief`, `npm run spotlight`, `npm run topic`

## Narrative Learning

- `GET /api/learning/summary`
- `GET /api/learning/topics?page=1&pageSize=20&search=<query>`
- `GET /api/learning/topics/<topic-id>`
- `GET /api/learning/key-resources?bucket=bestPerformance`
- `GET /api/learning/spotlight-outcomes`
- `GET /api/learning/attention-distribution`
- Use for historic lessons, topic search, resource extraction, outcome
  analysis, and optional distribution diagnostics.
- CLI: `npm run demo`, `npm run brief`, `npm run learning`, `npm run topics`,
  `npm run topic`

## Token Analysis

- `GET /api/market/token-metrics?addresses=<address>`
- Use as the Animeme public market fallback.
- Direct GMGN OpenAPI metrics are loaded by the local CLI when `GMGN_API_KEY`
  is configured.
- Combine GMGN metrics with live attention matches and learning topic matches.
- CLI: `npm run token -- --address <token-address>`
- Deep CLI: `npm run token:deep -- --address <token-address>`

For `token:deep`, do not call the analysis complete unless GMGN returns the
required hard-stop fields: top-10 holder share, creator/dev holding share,
insider pressure, and bundled activity.

## Direct GMGN

- `GET https://openapi.gmgn.ai/v1/token/info?chain=sol&address=<address>`
- Requires `GMGN_API_KEY` or `~/.config/gmgn/.env`.
- Use for direct token metrics, holder concentration, smart/KOL holder fields,
  insider pressure, bundled activity, and raw provider diagnostics.
- CLI: `npm run gmgn -- --address <token-address>`
- Used by: `npm run token`, `npm run token:deep`

## Binance Spot Public

- `GET https://api.binance.com/api/v3/time`
- `GET https://api.binance.com/api/v3/exchangeInfo`
- `GET https://api.binance.com/api/v3/ticker/price`
- `GET https://api.binance.com/api/v3/ticker/24hr`
- `GET https://api.binance.com/api/v3/ticker/bookTicker`
- `GET https://api.binance.com/api/v3/ticker`
- `GET https://api.binance.com/api/v3/ticker/tradingDay`
- `GET https://api.binance.com/api/v3/depth`
- `GET https://api.binance.com/api/v3/trades`
- `GET https://api.binance.com/api/v3/aggTrades`
- `GET https://api.binance.com/api/v3/klines`
- `GET https://api.binance.com/api/v3/uiKlines`
- `GET https://api.binance.com/api/v3/avgPrice`
- `GET https://api.binance.com/api/v3/ping`
- Use for centralized market reference data, ticker, book, trade, and candle
  context.
- CLI: `npm run binance -- --symbol SOLUSDT`
- Raw CLI: `npm run binance:spot -- --path /api/v3/ticker/price --symbol SOLUSDT`

## Binance Web3 Public

- Token search:
  `/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search/ai`
- Token metadata:
  `/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info/ai`
- Token dynamic market data:
  `/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info/ai`
- Token kline:
  `https://dquery.sintral.io/u-kline/v1/k-line/candles`
- Use for token search, metadata, socials, dynamic market fields, holders,
  liquidity, volume, and candles across BSC, Base, and Solana.
- CLI: `npm run binance:web3 -- --mode search --keyword SOL --chain-ids CT_501`
- Modes: `search`, `meta`, `dynamic`, `kline`

## Token Intelligence Skill

- Skill: `.agents/skills/animeme-token-intelligence/SKILL.md`
- Use for token safety, holder-quality, crowding, manipulation-risk, and
  conviction reviews.
- Output is branded as Animeme Intelligence. It may name Animeme, GMGN, and
  Binance as data sources, but must never expose secret values.

## Default Agent Demo

Use this flow when a user has just installed Animeme Agent and wants to see it
work:

1. `npm run catalog`
2. `npm run doctor`
3. `npm run demo`
4. Pick the strongest topic from the demo or scan output.
5. `npm run thesis -- --topic <topic-id>`
6. `npm run risk -- --topic <topic-id>`
7. Summarize the Markdown artifacts written under `artifacts/`.

For token users, ask for a token address and run:

```bash
npm run doctor
npm run token:deep -- --address <token-address>
npm run gmgn -- --address <token-address>
npm run binance -- --symbol SOLUSDT --address <token-address>
```

## Raw Public Fetch

- Any public Animeme path under `/api/*`.
- CLI: `npm run fetch -- --path /api/learning/topics?pageSize=5`

## Artifact Policy

- JSON and Markdown artifacts go under `artifacts/`.
- Artifacts are advisory research records, not trading instructions.
- Never store private keys, cookies, credentials, or wallet material.
