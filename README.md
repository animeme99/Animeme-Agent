# Animeme Agent

Cloneable read-only agent kit for scouting live Animeme attention data.

This repo is intentionally advisory in v1. It does not trade, sign wallet
transactions, store private keys, or mutate Animeme state.

## Quickstart

```bash
git clone https://github.com/0xchalker/Animeme-Agent.git
cd Animeme-Agent
npm install
npm run typecheck
npm run scan
```

Optional: point the kit at a local Animeme web server while developing the
main app.

```bash
ANIMEME_API_BASE_URL=http://127.0.0.1:3000 npm run scan
```

## Commands

```bash
npm run scan
npm run thesis -- --topic <topic-id>
npm run risk -- --topic <topic-id>
npm run watch -- --topic <topic-id>
```

Outputs are written into `artifacts/` as JSON and Markdown.

## Agent Skill

This repo intentionally ships one umbrella skill:

```text
.agents/skills/animeme-data/SKILL.md
```

The `animeme-data` skill covers live scans, topic thesis work, risk review,
watchlists, and artifact publishing. Agents should use this one skill for all
public Animeme data workflows.

## Agent Tool Compatibility

Codex:

```bash
codex "Use AGENTS.md, load the animeme-data skill, run npm run scan, then write a thesis artifact."
```

Claude Code:

```bash
claude "Read CLAUDE.md, load the animeme-data skill, run npm run scan, then write a risk review."
```

OpenCode:

```bash
opencode
```

OpenCode will read `opencode.json` and discover the `animeme-data` skill.

## Public Data Contract

Primary endpoint:

```text
GET https://animeme.app/api/agent/context
```

Fallback endpoint used automatically if `/api/agent/context` is not deployed
yet:

```text
GET https://animeme.app/api/now-attention-feed?modes=rising,latest,viral
```

Supporting public endpoints:

```text
GET https://animeme.app/api/spotlight
GET https://animeme.app/api/learning/summary
GET https://animeme.app/api/learning/topics
```

## Modes

Agent mode converts Animeme context into local agent tasks and structured
artifacts.

Human mode keeps output short and advisory for manual review.

No command in this repo should require private credentials.
