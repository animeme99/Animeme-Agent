# Animeme Public Data Catalog

This repo exposes one local agent skill over the public Animeme API surface.
Everything is read-only and advisory.

## Live Attention

- `GET /api/now-attention-feed?modes=rising,latest,viral`
- Use for current hot trends, new topics, viral topics, topic token lists, and
  local scan artifacts.
- CLI: `npm run scan`, `npm run hot`, `npm run new`

## Attention Spotlight

- `GET /api/spotlight?limit=15&historyLimit=30`
- `GET /api/spotlight-topic-signals?topicIds=<topic-id>`
- `GET /api/spotlight-performance-notifications`
- Use for canonical Spotlight cards, first-signal context, recent milestone
  alerts, and topic-level performance history.
- CLI: `npm run spotlight`, `npm run topic`

## Narrative Learning

- `GET /api/learning/summary`
- `GET /api/learning/topics?page=1&pageSize=20&search=<query>`
- `GET /api/learning/topics/<topic-id>`
- `GET /api/learning/key-resources?bucket=bestPerformance`
- `GET /api/learning/spotlight-outcomes`
- `GET /api/learning/attention-distribution`
- Use for historic lessons, topic search, resource extraction, outcome
  analysis, and attention distribution.
- CLI: `npm run learning`, `npm run topics`, `npm run topic`

## Token Analysis

- `GET /api/market/token-metrics?addresses=<address>`
- Use for arbitrary token market metrics through Animeme public routes.
- Combine with live attention matches and learning topic matches.
- CLI: `npm run token -- --address <token-address>`

## Raw Public Fetch

- Any public Animeme path under `/api/*`.
- CLI: `npm run fetch -- --path /api/learning/topics?pageSize=5`

## Artifact Policy

- JSON and Markdown artifacts go under `artifacts/`.
- Artifacts are advisory research records, not trading instructions.
- Never store private keys, cookies, credentials, or wallet material.
