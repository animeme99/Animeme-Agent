# Animeme Agent

One clone, all public Animeme data for local agents.

This repo is intentionally read-only. It does not trade, sign wallet
transactions, store private keys, or mutate Animeme state.

## Install As A Skill

```bash
npx skills add 0xchalker/Animeme-Agent
```

## Clone And Run

```bash
git clone https://github.com/0xchalker/Animeme-Agent.git
cd Animeme-Agent
npm install
npm run typecheck
npm run catalog
npm run scan
```

Optional local base URL while developing `animeme.app`:

```bash
ANIMEME_API_BASE_URL=http://127.0.0.1:3000 npm run scan
```

## Commands

```bash
npm run catalog
npm run scan
npm run hot -- --limit 20
npm run new -- --mode latest
npm run spotlight
npm run learning
npm run topics -- --search <query>
npm run topic -- --topic <topic-id>
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
npm run fetch -- --path /api/learning/topics?pageSize=5
npm run thesis -- --topic <topic-id>
npm run risk -- --topic <topic-id>
npm run watch -- --topic <topic-id>
```

Outputs are written into `artifacts/` as JSON and Markdown.

## What Agents Can Access

- Live Now Attention boards: rising, latest, viral.
- Attention Spotlight and recent performance notifications.
- Narrative Learning summary, topics, topic details, key resources, outcomes,
  and attention distribution.
- Neutral market metrics and Animeme Intelligence scoring for arbitrary token
  addresses through Animeme public API routes.
- Raw read-only fetches for any public Animeme `/api/*` path.

See `docs/data-catalog.md`, `docs/token-intelligence-playbook.md`, or run
`npm run catalog`.

## Agent Skill

This repo ships two public-facing skills:

```text
.agents/skills/animeme-data/SKILL.md
.agents/skills/animeme-token-intelligence/SKILL.md
```

The `animeme-data` skill covers all public Animeme data workflows: trend
scouting, topic search, token analysis, Spotlight review, learning research,
risk review, watchlists, and artifact publishing.

The `animeme-token-intelligence` skill is for deeper token safety, crowding,
holder-quality, and conviction reviews.

## Agent Tool Compatibility

Codex:

```bash
codex "Use AGENTS.md, load the animeme-data skill, run npm run scan, then analyze the strongest topic."
```

Claude Code:

```bash
claude "Read CLAUDE.md, load the animeme-data skill, run npm run token -- --address <token-address>."
```

OpenCode:

```bash
opencode
```

OpenCode reads `opencode.json` and can run the approved read-only scripts.

## Modes

Agent mode converts Animeme public data into local agent tasks and structured
artifacts.

Human mode keeps output short and advisory for manual review.

No command in this repo should require private credentials.
