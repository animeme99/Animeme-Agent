# Animeme Agent Kit Instructions

## Mission

Use Animeme public data to scout meme attention trends, create concise
narrative theses, review obvious risk, and publish local advisory artifacts.

This repo is read-only with respect to markets and Animeme production systems.
Do not trade, sign transactions, request private keys, or automate wallet
actions.

## Fast Path

1. Run `npm install` if dependencies are missing.
2. Run `npm run typecheck`.
3. Load the single local skill at `.agents/skills/animeme-data/SKILL.md`.
4. Run `npm run scan` to load current Animeme context.
5. Use `npm run thesis -- --topic <topic-id>`, `npm run risk -- --topic <topic-id>`, or `npm run watch -- --topic <topic-id>`.
6. Save outputs only under `artifacts/`.

## Data Source

Default base URL: `https://animeme.app`

Override with:

```bash
ANIMEME_API_BASE_URL=http://127.0.0.1:3000
```

Prefer `GET /api/agent/context`. If it is unavailable, fall back to
`GET /api/now-attention-feed?modes=rising,latest,viral`.

## Agent Mode

When the user asks for agent mode:

- Turn the topic context into tasks that Codex, Claude Code, or OpenCode can run locally.
- Use the umbrella `animeme-data` skill for all public Animeme data workflows.
- Prefer `scan`, `thesis`, `risk`, and `watch` commands before inventing new data flows.
- Write JSON and Markdown artifacts into `artifacts/`.
- Keep every recommendation advisory and reversible.

## Human Mode

When the user asks for human mode:

- Summarize the strongest current topic in plain language.
- Explain why it is trending, what could invalidate it, and what to watch next.
- Avoid long automation plans.

## Memory Policy

Only write memory after the user clones this repo and starts using it.
Do not backfill older Animeme sessions.
Do not store secrets, cookies, private keys, exported browser data, or wallet
material in `memory/`.
