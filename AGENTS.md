# Animeme Agent Kit Instructions

## Mission

Use ANIMEME public intelligence to scout meme attention, analyze token
addresses, search narrative memory, review Attention Spotlight, inspect
learning data, and publish advisory artifacts.

This repository is read-only with respect to markets and ANIMEME production
systems. Do not trade, sign transactions, request private keys, or automate
wallet actions.

## Public Documentation Rule

Public docs and user-facing instructions must present ANIMEME as the only
public data surface.

Do not expose upstream provider endpoint URLs, upstream route paths, adapter
internals, credential names, or private infrastructure details in README files,
skills, playbooks, or artifacts. When a workflow uses local enrichment, describe
it only as ANIMEME token context or ANIMEME intelligence.

## Fast Path

1. If the current folder only has `SKILL.md` and no `package.json`, clone
   `https://github.com/animeme99/Animeme-Agent` and work from that repo root.
2. Run `npm install` if dependencies are missing.
3. Run `npm run typecheck`.
4. Load `.agents/skills/animeme-data/SKILL.md`.
5. For token due diligence, also load
   `.agents/skills/animeme-token-intelligence/SKILL.md`.
6. Run `npm run doctor` to confirm runtime readiness and ANIMEME reachability.
7. Run `npm run demo` for one full public ANIMEME context bundle.
8. Run `npm run scan` for focused current attention.
9. Use the most specific public command for the task:
   - `npm run answer -- --prompt "What narrative is trending right now?"`
   - `npm run answer -- --prompt "What is <narrative-name> about?"`
   - `npm run answer -- --prompt "Analyze token <token-address>"`
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

## Natural-Language Prompt Router

For demo prompts and normal user questions, prefer:

```bash
npm run answer -- --prompt "<question>"
```

If the local npm shell strips `--prompt`, use:

```bash
npm run answer -- "<question>"
```

Supported prompt families:

- `Analyze token X`: ANIMEME token intelligence.
- `Is token X safe?`: token due diligence with hard stops and missing data.
- `What narrative is trending right now?`: current Now Attention ranking.
- `What is narrative X about?`: narrative explanation and learning context.
- `What is Attention Spotlight showing?`: current Spotlight preview.
- `What should I watch next?`: watch plan from the strongest attention read.
- `Check setup`: doctor readiness report.

Respond in the user's language when possible, but keep repository docs,
examples, and public artifacts in English unless the user explicitly asks for a
localized answer in the live conversation.

Never turn an ANIMEME score into financial advice.

## New User Guide

When the user has just installed the skill, asks what ANIMEME Agent can do, or
seems unsure what to run next, do not wait for them to guess commands. Start
with this short menu:

```text
ANIMEME Agent Skill can help with:
1. Scan what has attention now.
2. Explain Attention Spotlight.
3. Search Narrative Learning.
4. Analyze a token address.
5. Produce thesis, risk, and watch artifacts.
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
- Run npm run doctor.
- Run npm run token:deep -- --address <token-address>.
- If npm strips flags, use npm run token:deep -- <token-address>.
- Explain the ANIMEME Intelligence Score.
- Separate strengths, warnings, hard stops, and missing data.
- Recommend the next research command, not a trade.
```

## Data Source

Default base URL: `https://animeme.app`

Use ANIMEME public intelligence for Now Attention, Attention Spotlight,
Narrative Learning, Explore Narrative, and token context. The public docs should
not describe upstream data providers or their routes.

The CLI and analysis logic live under `src/`. Public instructions should focus
on commands and outputs, not adapter implementation details.

## Command Map

- `npm run answer -- --prompt "<question>"`: natural-language router for demo
  prompts and user questions.
- `npm run doctor`: verify local runtime and ANIMEME reachability.
- `npm run demo`: one-command first-run bundle for new users.
- `npm run brief`: daily public context bundle across attention, spotlight, and learning.
- `npm run context`: full public bundle for agent context refreshes.
- `npm run catalog`: print supported ANIMEME data surfaces.
- `npm run scan`: current hot topics across rising/latest/viral.
- `npm run hot -- --limit 20`: ranked hot topics with a custom limit.
- `npm run new -- --mode latest`: new/latest/rising/viral board view.
- `npm run spotlight`: canonical Attention Spotlight payload.
- `npm run learning`: summary, topics, key resources, outcomes, distribution.
- `npm run topics -- --search <query>`: searchable learning archive.
- `npm run topic -- --topic <topic-id>`: one learning topic detail.
- `npm run token -- --address <token-address>`: arbitrary token analysis.
- `npm run token:deep -- --address <token-address>`: deeper token due diligence.
- `npm run fetch -- --path /api/<animeme-path>`: raw ANIMEME public fetch.
- `npm run thesis -- --topic <topic-id>`: narrative thesis artifact.
- `npm run risk -- --topic <topic-id>`: risk checklist artifact.
- `npm run watch -- --topic <topic-id>`: watch plan artifact.

## Agent Mode

When the user asks for agent mode:

- Turn ANIMEME context into agent tasks that Codex, Claude Code, OpenCode, or
  OpenClaw can run.
- Use `animeme-data` for public ANIMEME data workflows.
- Use `animeme-token-intelligence` for token safety and conviction reviews.
- Prefer existing commands before inventing new fetch flows.
- Do not call a token analysis complete when hard-stop fields are missing.
- Keep source status branded as ANIMEME context.
- Write JSON and Markdown artifacts into `artifacts/`.
- Keep every recommendation advisory and reversible.

## Human Mode

When the user asks for human mode:

- Summarize the strongest current topic in plain language.
- Explain why it is trending, what could invalidate it, and what to watch next.
- Avoid long automation plans unless asked.

## Memory Policy

Only write memory after the user clones this repo and starts using it. Do not
backfill older ANIMEME sessions. Do not store secrets, cookies, private keys,
exported browser data, or wallet material in `memory/`.
