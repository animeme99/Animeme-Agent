---
name: animeme-data
description: Use live public ANIMEME intelligence to scan trends, inspect Attention Spotlight, query Narrative Learning, analyze tokens, and publish advisory artifacts for Codex, Claude Code, OpenCode, and OpenClaw.
---

# ANIMEME Data

Use this skill whenever the user asks an agent to work with ANIMEME public
intelligence. It is compatible with Codex, Claude Code, OpenCode, OpenClaw, and
other AgentSkills-compatible runtimes.

For deeper token due diligence, also load
`.agents/skills/animeme-token-intelligence/SKILL.md`.

## Public Documentation Rule

Keep public docs ANIMEME-only. Do not expose upstream provider endpoints,
provider route paths, adapter internals, credential names, or private
infrastructure details. Describe data as ANIMEME public intelligence, ANIMEME
token context, ANIMEME learning, or ANIMEME spotlight context.

## Scope

- Read live public context from `https://animeme.app`.
- Access Now Attention, Attention Spotlight, Narrative Learning, Explore
  Narrative, and ANIMEME token context.
- Prefer the CLI commands in this repo before inventing new fetch flows.
- Create advisory JSON and Markdown artifacts under `artifacts/`.
- Never trade, sign transactions, request private keys, or mutate ANIMEME
  production state.

If the current working folder only contains this `SKILL.md` and no
`package.json`, clone the repo first:

```bash
git clone https://github.com/animeme99/Animeme-Agent.git
cd Animeme-Agent
npm install
```

## Fast Path

```bash
npm run answer -- --prompt "What narrative is trending right now?"
npm run answer -- --prompt "What is <narrative-name> about?"
npm run answer -- --prompt "Analyze token <token-address>"
npm run doctor
npm run demo
npm run brief
npm run catalog
npm run scan
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
npm run spotlight
npm run learning
```

If npm strips flags in the current shell, token commands accept positional
forms such as:

```bash
npm run token:deep -- <token-address>
```

## Natural-Language Demo Router

Use `npm run answer -- --prompt "<question>"` when the user asks in normal
language. It is the best path for video demos and first-time users.

If the local npm shell strips `--prompt`, use:

```bash
npm run answer -- "<question>"
```

Supported prompt families:

- `Analyze token X`: ANIMEME token intelligence.
- `Is token X safe?`: token due diligence with warnings and hard stops.
- `What narrative is trending right now?`: current Now Attention ranking.
- `What is narrative X about?`: live topic, learning, and spotlight context.
- `What is Attention Spotlight showing?`: current Spotlight preview.
- `What should I watch next?`: watch plan from current attention.
- `Check setup`: doctor readiness report.

Keep the response concise: conclusion, ANIMEME context used, signal read,
warnings or hard stops, missing data, and next prompt.

## First Response Guide

When the user just installed the skill, asks what ANIMEME can do, or seems
unsure where to start, respond with this menu before running commands:

```text
ANIMEME Agent Skill can help with:
1. Scan what has attention now.
2. Explain Attention Spotlight.
3. Search Narrative Learning.
4. Analyze a token address.
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
- Run npm run doctor.
- Run npm run token:deep -- --address <token-address>.
- Explain the ANIMEME Intelligence Score.
- Separate strengths, warnings, hard stops, and missing data.
- Recommend the next research command, not a trade.
```

## Data Commands

```bash
npm run hot -- --limit 20
npm run new -- --mode latest
npm run topics -- --search <query>
npm run topic -- --topic <topic-id>
npm run fetch -- --path /api/<animeme-path>
```

Only use `fetch` for ANIMEME public routes.

## Artifact Commands

```bash
npm run thesis -- --topic <topic-id>
npm run risk -- --topic <topic-id>
npm run watch -- --topic <topic-id>
```

## Workflow

1. Run `npm run catalog` when you need to know which ANIMEME data surface fits
   the task.
2. Run `npm run doctor` when setup or reachability is unknown.
3. Run `npm run demo`, `npm run brief`, or `npm run context` when the user
   wants the easiest full public data snapshot.
4. Run `npm run scan` to get focused live attention context.
5. Use `token` for arbitrary token address analysis.
6. Use `token:deep` when the user asks if a token is safe, risky, crowded, or
   worth deeper research.
7. Use `spotlight` when the user asks what Attention Spotlight is showing.
8. Use `learning`, `topics`, or `topic` when the user asks for historic lessons
   or narrative research.
9. Use `thesis`, `risk`, and `watch` to turn a selected topic into an advisory
   artifact.
10. Keep all outputs advisory, timestamped, and user-controlled.

## Interpretation Rules

- Strong trend means a topic is visible in ANIMEME live attention and has
  enough catalyst, flow, token surface, or Spotlight context to justify more
  research.
- New topic means it appears in recent ANIMEME attention.
- Token analysis should combine live topic matches, ANIMEME token context, and
  ANIMEME learning archive matches.
- Missing data is not bullish. State what is missing and keep the item in
  observation mode.
- Do not call token hard stops cleared when required context is missing.

## Memory

Only write memory after the user clones this repo and starts using it. Do not
backfill older sessions. Do not store secrets or wallet material.
