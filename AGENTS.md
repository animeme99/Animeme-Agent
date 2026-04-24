# Animeme Agent Kit Instructions

## Mission

Use Animeme public data to scout meme attention trends, analyze arbitrary token
addresses, search narrative topics, review Attention Spotlight, inspect
learning data, and publish local advisory artifacts.

This repo is read-only with respect to markets and Animeme production systems.
Do not trade, sign transactions, request private keys, or automate wallet
actions.

## Fast Path

1. Run `npm install` if dependencies are missing.
2. Run `npm run typecheck`.
3. Load the single local skill at `.agents/skills/animeme-data/SKILL.md`.
4. Run `npm run catalog` to see the public data surface.
5. Run `npm run scan` for current attention.
6. Use the most specific command for the task:
   - `npm run token -- --address <token-address>`
   - `npm run topics -- --search <query>`
   - `npm run spotlight`
   - `npm run learning`
   - `npm run thesis -- --topic <topic-id>`
   - `npm run risk -- --topic <topic-id>`
   - `npm run watch -- --topic <topic-id>`
7. Save outputs only under `artifacts/`.

## Data Source

Default base URL: `https://animeme.app`

Override with:

```bash
ANIMEME_API_BASE_URL=http://127.0.0.1:3000
```

Use only public Animeme `/api/*` routes. The local client is in
`src/animeme-client.ts`; all analysis and artifact logic is in `src/cli.ts`.
Do not require private credentials.

## Command Map

- `npm run catalog`: print all supported public API surfaces.
- `npm run scan`: current hot topics across rising/latest/viral.
- `npm run hot -- --limit 20`: ranked hot topics with a custom limit.
- `npm run new -- --mode latest`: new/latest/rising/viral board view.
- `npm run spotlight`: canonical Attention Spotlight payload.
- `npm run learning`: summary, topics, key resources, outcomes, distribution.
- `npm run topics -- --search <query>`: searchable learning archive.
- `npm run topic -- --topic <topic-id>`: one learning topic detail.
- `npm run token -- --address <token-address>`: arbitrary token analysis.
- `npm run fetch -- --path /api/<path>`: raw public Animeme API fetch.
- `npm run thesis -- --topic <topic-id>`: narrative thesis artifact.
- `npm run risk -- --topic <topic-id>`: risk checklist artifact.
- `npm run watch -- --topic <topic-id>`: watch plan artifact.

## Agent Mode

When the user asks for agent mode:

- Turn Animeme context into local tasks that Codex, Claude Code, or OpenCode can
  run.
- Use the umbrella `animeme-data` skill for all public Animeme data workflows.
- Prefer existing commands before inventing new fetch flows.
- Write JSON and Markdown artifacts into `artifacts/`.
- Keep every recommendation advisory and reversible.

## Human Mode

When the user asks for human mode:

- Summarize the strongest current topic in plain language.
- Explain why it is trending, what could invalidate it, and what to watch next.
- Avoid long automation plans unless asked.

## Memory Policy

Only write memory after the user clones this repo and starts using it. Do not
backfill older Animeme sessions. Do not store secrets, cookies, private keys,
exported browser data, or wallet material in `memory/`.
