---
name: animeme-data
description: Use live public Animeme data to scan attention, build topic theses, review risk, and create watchlist artifacts for Codex, Claude Code, and OpenCode.
---

# Animeme Data

Use this single skill whenever the user asks an agent to work with Animeme
public data.

## Scope

- Read live context from `https://animeme.app`.
- Prefer the CLI commands in this repo before inventing new fetch flows.
- Create advisory JSON and Markdown artifacts under `artifacts/`.
- Never trade, sign transactions, request private keys, or mutate production
  Animeme state.

## Fast Path

```bash
npm run scan
npm run thesis -- --topic <topic-id>
npm run risk -- --topic <topic-id>
npm run watch -- --topic <topic-id>
```

## Workflow

1. Run `npm run scan` to get the current Animeme context.
2. Pick the topic with the clearest combination of attention score, flow,
   market cap movement, and narrative clarity.
3. Use `thesis` when the user needs a tradeable story explanation.
4. Use `risk` when the user needs invalidation, crowding, or fake-signal checks.
5. Use `watch` when the user needs local monitoring criteria.
6. Keep all outputs advisory and timestamped.

## Memory

Only write memory after the user clones this repo and starts using it. Do not
backfill older sessions. Do not store secrets or wallet material.
