---
name: animeme-data
description: Use live public Animeme data, direct GMGN metrics, and Binance public market/Web3 data to scan trends, analyze tokens, inspect Attention Spotlight, query learning data, and publish advisory artifacts for Codex, Claude Code, OpenCode, and OpenClaw.
---

# Animeme Data

Use this skill whenever the user asks an agent to work with Animeme public
data. It is compatible with Codex, Claude Code, OpenCode, OpenClaw, and other
AgentSkills-compatible runtimes. For deeper token due diligence, also load
`.agents/skills/animeme-token-intelligence/SKILL.md`.

## Scope

- Read live public context from `https://animeme.app`.
- Access current trend boards, new topics, Attention Spotlight, learning data,
  direct GMGN token metrics, Binance public market/Web3 data, and Animeme
  market fallback metrics for arbitrary token addresses.
- Prefer the CLI commands in this repo before inventing new fetch flows.
- Create advisory JSON and Markdown artifacts under `artifacts/`.
- Never trade, sign transactions, request private keys, or mutate production
  Animeme state.

If the current working folder only contains this `SKILL.md` and no
`package.json`, clone the repo first:

```bash
git clone https://github.com/0xchalker/Animeme-Agent.git
cd Animeme-Agent
npm install
```

## Fast Path

```bash
npm run doctor
npm run demo
npm run brief
npm run catalog
npm run scan
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
npm run gmgn -- --address <token-address>
npm run binance -- --symbol SOLUSDT
npm run binance:spot -- --path /api/v3/ticker/price --symbol SOLUSDT
npm run binance:web3 -- --mode search --keyword SOL --chain-ids CT_501
npm run spotlight
npm run learning
```

For complete token analysis, configure `GMGN_API_KEY` in the environment or in
`~/.config/gmgn/.env`. The doctor command checks only whether it exists.
If npm strips flags in the current shell, token and provider commands accept
positional forms such as `npm run token:deep -- <token-address>` and
`npm run binance:spot -- /api/v3/ticker/price SOLUSDT`.

## First Response Guide

When the user just installed the skill, asks what Animeme can do, or seems
unsure where to start, respond with this menu before running commands:

```text
Animeme Agent can help with:
1. Scan what is hot now.
2. Explain Attention Spotlight.
3. Search Narrative Learning.
4. Analyze any token address.
5. Create thesis, risk, and watch artifacts.
```

Then propose the default demo:

```text
Default demo flow:
- Run npm run doctor.
- Run npm run demo.
- Pick the strongest topic from the demo or scan.
- Run npm run thesis -- --topic <topic-id>.
- Run npm run risk -- --topic <topic-id>.
- Summarize the artifact files created under artifacts/.
```

If the user provides a token address, use the token flow instead:

```text
Token demo flow:
- Run npm run doctor and check GMGN API key status.
- Run npm run token:deep -- --address <token-address>.
- Run npm run gmgn -- --address <token-address> when raw direct GMGN fields are
  needed.
- Run npm run binance -- --symbol SOLUSDT --address <token-address> when
  Binance Spot/Web3 context is needed.
- Explain the Animeme Intelligence Score.
- Separate strengths, warnings, hard stops, and missing data.
- Recommend the next research command, not a trade.
```

## Data Commands

```bash
npm run hot -- --limit 20
npm run new -- --mode latest
npm run topics -- --search <query>
npm run topic -- --topic <topic-id>
npm run fetch -- --path /api/learning/topics?pageSize=5
```

## Artifact Commands

```bash
npm run thesis -- --topic <topic-id>
npm run risk -- --topic <topic-id>
npm run watch -- --topic <topic-id>
```

## Workflow

1. Run `npm run catalog` when you need to know which public data surface fits
   the task.
2. Run `npm run doctor` when setup or API reachability is unknown.
3. Run `npm run demo`, `npm run brief`, or `npm run context` when the user
   wants the easiest full public data snapshot.
4. Run `npm run scan` to get a focused live attention context.
5. Use `token` for arbitrary token address analysis.
6. Use `token:deep` when the user asks if a token is safe, risky, manipulated,
   crowded, or worth deeper research. Complete analysis requires both Animeme
   trending data and GMGN API-key metrics.
7. Use `gmgn`, `binance`, `binance:spot`, or `binance:web3` when the user asks
   for raw provider data. Keep source sections separate.
8. Use `spotlight` when the user asks what Attention Spotlight is showing.
9. Use `learning`, `topics`, or `topic` when the user asks for historic lessons
   or narrative research.
10. Use `thesis`, `risk`, and `watch` to turn a selected topic into an advisory
   artifact.
11. Keep all outputs advisory, timestamped, and user-controlled.

## Interpretation Rules

- Strong trend means a topic is visible in live boards and has enough flow,
  token surface, or Spotlight context to justify more research.
- New topic means it appears on the latest board or recently entered learning
  data.
- Token analysis should combine live topic matches, GMGN API-key market
  metrics, Animeme market fallback data, and learning archive matches.
- Binance data is supporting market context. Do not treat Binance price or Web3
  tags as execution instructions.
- Missing data is not bullish. State what is missing and keep the item in
  observation mode.
- Do not call token hard stops cleared when GMGN API-key holder, insider, or
  bundler fields are missing.

## Memory

Only write memory after the user clones this repo and starts using it. Do not
backfill older sessions. Do not store secrets or wallet material.
