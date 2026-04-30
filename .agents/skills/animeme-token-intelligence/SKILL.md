---
name: animeme-token-intelligence
description: Perform advanced token due diligence with Animeme public attention, learning, and neutral market intelligence. Use when a user asks whether a token is safe, worth researching, crowded, manipulated, or backed by smart/KOL holder signals.
---

# Animeme Token Intelligence

Use this skill for token-level analysis. Keep the output branded as Animeme
Intelligence. For source status, explicitly distinguish Animeme trending data
from GMGN API-key token metrics.

## Scope

- Analyze any token address with public Animeme data.
- Combine live Now Attention matches, Learning archive matches, Spotlight
  context, direct GMGN API-key metrics, and Animeme market fallback metrics.
- Produce a clear score, verdict, strengths, warnings, and hard stops.
- Keep all conclusions advisory. Never trade, sign, request private keys, or
  tell the user a token is guaranteed safe.
- Do not call hard-stop checks cleared unless GMGN returns the required
  holder, insider, and bundler fields.

If the current working folder only contains this `SKILL.md` and no
`package.json`, clone the executable repo first:

```bash
git clone https://github.com/0xchalker/Animeme-Agent.git
cd Animeme-Agent
npm install
```

## Fast Path

```bash
npm run doctor
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
```

Use `token` for a quick report. Use `token:deep` for a fuller due-diligence
checklist.
If npm strips flags in the current shell, use
`npm run token:deep -- <token-address>`.

For complete token analysis, configure the GMGN key with either
`GMGN_API_KEY` or `~/.config/gmgn/.env`. `npm run doctor` reports only the key
status, never the key value.

## First Response Guide

When the user asks for token analysis but does not provide an address, ask for
the token address before running commands.

When an address is available, run:

```bash
npm run doctor
npm run token:deep -- --address <token-address>
```

Then summarize:

- Animeme Intelligence Score and verdict.
- Whether public API connectivity is ready or degraded.
- Whether GMGN API-key metrics are loaded, missing, partial, or failed.
- Live attention matches.
- Learning matches.
- GMGN/Animeme market metrics.
- Strengths.
- Warnings.
- Hard stops.
- Missing data.
- Next research command.

## Due-Diligence Framework

1. Start with live attention:
   - Is the token linked to a current rising/latest/viral topic?
   - Is the topic still moving or already stale?
   - Does the topic have real narrative context, not only ticker repetition?
2. Check GMGN API-key market metrics first, then Animeme market fallback:
   - top-10 holder concentration
   - creator/dev holding share
   - insider pressure
   - bundled activity
   - fresh-wallet mix
   - smart holder count
   - KOL holder count
   - If top-10 holder, creator/dev, insider, or bundled fields are missing
     from GMGN, mark the analysis incomplete.
3. Check learning context:
   - Does the token or topic match prior Animeme learning records?
   - Did similar patterns historically become winners or fail fast?
4. Produce one verdict:
   - `researchable`: enough clean signals to keep researching
   - `watch`: mixed or incomplete signals
   - `high-risk`: weak attention and poor/incomplete metrics
   - `avoid`: hard-stop concentration/manipulation risk

## Scoring Rules

- Live Animeme attention is a strength, not an execution signal.
- No live attention is a warning unless the user has a separate thesis.
- Top-10 holder share above 20% is a warning; above 50% is a hard stop.
- Creator/dev share above 10% is a warning; above 30% is a hard stop.
- Insider share above 10% is a warning; above 30% is a hard stop.
- Bundled activity above 15% is a warning; above 35% is a hard stop.
- Fresh-wallet share above 70% requires manual verification.
- Smart holder count above 3 improves confidence.
- KOL presence improves narrative reach but should not override hard stops.
- Missing GMGN API-key hard-stop fields cap confidence. Do not replace missing
  hard-stop fields with guesses.

## Output Rules

- Do not dump raw JSON unless the user asks.
- Do not reveal secret values. It is acceptable to name `GMGN API-key metrics`
  as a data source; never print the key itself.
- Refer to Animeme trend data as `Now Attention`, `Attention Spotlight`, or
  `Narrative Learning`.
- Explicitly say when data is missing.
- If a hard stop is present, stop escalation and explain why.

## Memory

Only write memory after the user clones this repo and starts using it. Do not
store secrets, cookies, API keys, or wallet material.
