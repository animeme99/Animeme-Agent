# Animeme Agent Kit Instructions

## Mission

Use Animeme public data to scout meme attention trends, analyze arbitrary token
addresses, search narrative topics, review Attention Spotlight, inspect
learning data, and publish advisory artifacts.

This repo is read-only with respect to markets and Animeme production systems.
Do not trade, sign transactions, request private keys, or automate wallet
actions.

## Fast Path

1. If the current folder only has `SKILL.md` and no `package.json`, clone
   `https://github.com/0xchalker/Animeme-Agent` and work from that repo root.
2. Run `npm install` if dependencies are missing.
3. Run `npm run typecheck`.
4. Load `.agents/skills/animeme-data/SKILL.md`.
5. For token due diligence, also load
   `.agents/skills/animeme-token-intelligence/SKILL.md`.
6. Run `npm run doctor` to confirm Node, public API reachability, and GMGN API
   key status.
7. Run `npm run demo` for one full public ANIMEME context bundle.
8. Run `npm run scan` for focused current attention.
9. Use the most specific command for the task:
   - `npm run brief`
   - `npm run token -- --address <token-address>`
   - `npm run token:deep -- --address <token-address>`
   - `npm run topics -- --search <query>`
   - `npm run spotlight`
   - `npm run learning`
   - `npm run thesis -- --topic <topic-id>`
   - `npm run risk -- --topic <topic-id>`
   - `npm run watch -- --topic <topic-id>`
10. Save outputs only under `artifacts/`.

## New User Guide

When the user has just installed the skill, asks what Animeme Agent can do, or
seems unsure what to run next, do not wait for them to guess commands. Start
with this short menu:

```text
Animeme Agent can help with:
1. Scan what is hot now.
2. Explain Attention Spotlight.
3. Search Narrative Learning.
4. Analyze any token address.
5. Create thesis, risk, and watch artifacts.
```

Then offer this demo flow:

```text
Default demo flow:
- Run npm run doctor.
- Run npm run demo.
- Pick the strongest topic from the demo or scan.
- Run npm run thesis -- --topic <topic-id>.
- Run npm run risk -- --topic <topic-id>.
- Summarize the artifact files created under artifacts/.
```

If the user provides a token address, switch to:

```text
Token demo flow:
- Run npm run doctor and verify GMGN API key status.
- Run npm run token:deep -- --address <token-address>.
- If npm strips flags, use npm run token:deep -- <token-address>.
- Explain the Animeme Intelligence Score.
- Separate strengths, warnings, hard stops, and missing data.
- Recommend the next research command, not a trade.
```

## Data Source

Default base URL: `https://animeme.app`

Use public Animeme `/api/*` routes for Now Attention, Spotlight, Learning, and
fallback token metrics. Token due diligence also uses direct GMGN OpenAPI
metrics when `GMGN_API_KEY` is configured. The key can come from the environment
or `~/.config/gmgn/.env`; never print it, commit it, or write it into
artifacts.

The Animeme API client is in `src/animeme-client.ts`, the direct GMGN client is
in `src/gmgn-client.ts`, and all analysis and artifact logic is in
`src/cli.ts`.

## Command Map

- `npm run doctor`: verify local runtime and public ANIMEME API reachability.
- `npm run demo`: one-command first-run bundle for new users.
- `npm run brief`: daily public context bundle across attention, spotlight, and learning.
- `npm run context`: same full public bundle for agent context refreshes.
- `npm run catalog`: print all supported public API surfaces.
- `npm run scan`: current hot topics across rising/latest/viral.
- `npm run hot -- --limit 20`: ranked hot topics with a custom limit.
- `npm run new -- --mode latest`: new/latest/rising/viral board view.
- `npm run spotlight`: canonical Attention Spotlight payload.
- `npm run learning`: summary, topics, key resources, outcomes, distribution.
- `npm run topics -- --search <query>`: searchable learning archive.
- `npm run topic -- --topic <topic-id>`: one learning topic detail.
- `npm run token -- --address <token-address>`: arbitrary token analysis.
- `npm run token:deep -- --address <token-address>`: deeper token due
  diligence with Animeme trending, direct GMGN API-key metrics, fallback
  Animeme market metrics, and Animeme Intelligence scoring.
- `npm run fetch -- --path /api/<path>`: raw public Animeme API fetch.
- `npm run thesis -- --topic <topic-id>`: narrative thesis artifact.
- `npm run risk -- --topic <topic-id>`: risk checklist artifact.
- `npm run watch -- --topic <topic-id>`: watch plan artifact.

## Agent Mode

When the user asks for agent mode:

- Turn Animeme context into agent tasks that Codex, Claude Code, OpenCode, or
  OpenClaw can run.
- Use `animeme-data` for public Animeme data workflows.
- Use `animeme-token-intelligence` for token safety and conviction reviews.
- Prefer existing commands before inventing new fetch flows.
- Do not call a token analysis complete unless direct GMGN API-key hard-stop
  fields are loaded.
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
