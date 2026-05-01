# ANIMEME Public Data Catalog

This catalog documents the public ANIMEME data surfaces exposed to agents.
Everything is read-only and advisory.

## Public Documentation Rule

This document must remain ANIMEME-only. Do not expose upstream provider
endpoints, upstream route paths, adapter internals, credential names, or private
infrastructure details.

Use these terms:

- ANIMEME live attention
- ANIMEME spotlight context
- ANIMEME narrative memory
- ANIMEME learning archive
- ANIMEME token context
- ANIMEME artifact output

## First-Run Commands

- `npm run doctor`: checks local runtime readiness and ANIMEME reachability.
- `npm run demo`: loads the easiest first-run public context bundle.
- `npm run brief`: creates a daily-style context bundle across Now Attention,
  Attention Spotlight, and Narrative Learning.
- `npm run context`: refreshes full public ANIMEME context for a longer agent
  session.

## Live Attention

Use for current Attention Reads, new topics, rising topics, viral topics, topic
token surfaces, and scan artifacts.

CLI:

```bash
npm run demo
npm run brief
npm run scan
npm run hot
npm run new
```

Best questions:

- What has attention right now?
- Which topic is moving fastest?
- Which topic has a clear catalyst?
- Which topic deserves a thesis?

## Attention Spotlight

Use for canonical Spotlight cards, first-signal context, recent milestone
alerts, and topic-level signal history.

CLI:

```bash
npm run demo
npm run brief
npm run spotlight
npm run topic -- --topic <topic-id>
```

Best questions:

- What is Spotlight highlighting?
- Why did this topic enter Spotlight?
- What changed after first trigger?
- Is this attention early, rising, crowded, weak, or real heat?

## Narrative Learning

Use for historic lessons, topic search, resource extraction, outcome analysis,
and learning diagnostics.

CLI:

```bash
npm run demo
npm run brief
npm run learning
npm run topics -- --search <query>
npm run topic -- --topic <topic-id>
```

Best questions:

- What has ANIMEME learned from past attention cycles?
- Which narrative archetypes repeat?
- What prior examples look similar?
- Which catalyst patterns have historically worked?

## Explore Narrative

Use for searchable narrative memory. This is the best surface when the user
asks what a narrative is about or whether ANIMEME has seen a similar setup.

CLI:

```bash
npm run topics -- --search <query>
npm run topic -- --topic <topic-id>
```

Best questions:

- What is this narrative about?
- Has ANIMEME seen this story before?
- What topic has the cleanest source context?
- Which topic should be compared against the live board?

## Token Analysis

Use ANIMEME token context for advisory token due diligence. Token analysis
should combine live attention, learning memory, spotlight context when
available, concentration signals, crowding signals, missing-data checks, and
hard stops.

CLI:

```bash
npm run answer -- --prompt "Analyze token <token-address>"
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
```

For `token:deep`, do not call the analysis complete unless required hard-stop
fields are present. Missing data must remain visible in the final answer.

## Thesis, Risk, And Watch Artifacts

Use these commands after selecting a topic:

```bash
npm run thesis -- --topic <topic-id>
npm run risk -- --topic <topic-id>
npm run watch -- --topic <topic-id>
```

Artifact purpose:

- `thesis`: turns a topic into a narrative claim.
- `risk`: lists invalidation rules and hard-stop concerns.
- `watch`: defines what should be monitored next.

## Raw ANIMEME Fetch

Advanced agents can fetch allowed ANIMEME public paths:

```bash
npm run fetch -- --path /api/<animeme-path>
```

Only use this for ANIMEME public routes. Do not document or fetch upstream
provider endpoints in public playbooks.

## Default Agent Demo

Use this flow when a user has just installed ANIMEME Agent and wants to see it
work:

1. `npm run catalog`
2. `npm run doctor`
3. `npm run demo`
4. Pick the strongest topic from the demo or scan output.
5. `npm run thesis -- --topic <topic-id>`
6. `npm run risk -- --topic <topic-id>`
7. Summarize the Markdown artifacts written under `artifacts/`.

For token users, ask for a token address and run:

```bash
npm run doctor
npm run token:deep -- --address <token-address>
```

## Artifact Policy

- JSON and Markdown artifacts go under `artifacts/`.
- Artifacts are advisory research records, not trading instructions.
- Never store private keys, cookies, credentials, account sessions, or wallet
  material.
- Keep artifacts ANIMEME-branded and avoid exposing provider internals.
