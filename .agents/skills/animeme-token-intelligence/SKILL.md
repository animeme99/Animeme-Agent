---
name: animeme-token-intelligence
description: Perform advanced token due diligence with ANIMEME public attention, learning, spotlight, and token context. Use when a user asks whether a token is safe, worth researching, crowded, manipulated, or backed by meaningful attention signals.
---

# ANIMEME Token Intelligence

Use this skill for token-level analysis. Keep output branded as ANIMEME
Intelligence.

## Public Documentation Rule

Public docs must not expose upstream provider endpoints, upstream route paths,
adapter internals, credential names, or private infrastructure details. Describe
inputs as ANIMEME token context, ANIMEME learning context, ANIMEME attention,
and ANIMEME spotlight context.

## Scope

- Analyze any token address with ANIMEME public intelligence.
- Combine live Now Attention matches, Narrative Learning matches, Attention
  Spotlight context, and ANIMEME token context.
- Produce a clear score, verdict, strengths, warnings, missing data, and hard
  stops.
- Keep all conclusions advisory.
- Never trade, sign, request private keys, or tell the user a token is
  guaranteed safe.
- Do not call hard-stop checks cleared when required context is missing.

If the current working folder only contains this `SKILL.md` and no
`package.json`, clone the executable repo first:

```bash
git clone https://github.com/animeme99/Animeme-Agent.git
cd Animeme-Agent
npm install
```

## Fast Path

```bash
npm run answer -- --prompt "Analyze token <token-address>"
npm run answer -- --prompt "Is token <token-address> safe?"
npm run doctor
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
```

Use `token` for a quick report. Use `token:deep` for a fuller due-diligence
checklist.

If npm strips flags in the current shell, use:

```bash
npm run token:deep -- <token-address>
```

## Demo Prompt Handling

When the user writes a natural-language token prompt, prefer:

```bash
npm run answer -- --prompt "Analyze token <token-address>"
```

Use it for prompts like:

- `Analyze token X`
- `Is token X safe?`
- `Is token X worth researching?`
- `What are the risks for token X?`
- `Does token X match any ANIMEME narrative?`

The answer must separate:

- ANIMEME Now Attention status
- ANIMEME Narrative Learning status
- ANIMEME Spotlight status
- ANIMEME token context
- strengths
- warnings
- hard stops
- missing data
- next research step

If required hard-stop fields are missing, keep confidence capped and say the
token is not fully cleared even when the narrative looks strong.

## First Response Guide

When the user asks for token analysis but does not provide an address, ask for
the token address before running commands.

When an address is available, run:

```bash
npm run doctor
npm run token:deep -- --address <token-address>
```

Then summarize:

- ANIMEME Intelligence Score and verdict
- connectivity status
- live attention matches
- learning matches
- spotlight context
- token context
- strengths
- warnings
- hard stops
- missing data
- next research command

## Due-Diligence Framework

1. Start with live attention:
   - Is the token linked to a current rising/latest/viral topic?
   - Is the topic still moving or already stale?
   - Does the topic have real narrative context, not only ticker repetition?
2. Check ANIMEME token context:
   - concentration signals
   - creator/dev concentration
   - insider pressure
   - bundled activity
   - fresh-wallet mix
   - smart holder context
   - KOL holder context
   - missing hard-stop fields
3. Check learning context:
   - Does the token or topic match prior ANIMEME learning records?
   - Did similar patterns historically become winners or fail fast?
4. Check Spotlight context:
   - Did ANIMEME detect a first trigger?
   - Did the topic keep attention after the trigger?
   - Is the topic early, rising, crowded, weak, or becoming real heat?
5. Produce one verdict:
   - `researchable`: enough clean signals to keep researching
   - `watch`: mixed or incomplete signals
   - `high-risk`: weak attention and poor/incomplete context
   - `avoid`: hard-stop concentration or manipulation risk

## Scoring Rules

- Live ANIMEME attention is a strength, not an execution signal.
- No live attention is a warning unless the user has a separate thesis.
- Top-holder concentration above 20% is a warning; above 50% is a hard stop.
- Creator/dev concentration above 10% is a warning; above 30% is a hard stop.
- Insider pressure above 10% is a warning; above 30% is a hard stop.
- Bundled activity above 15% is a warning; above 35% is a hard stop.
- Fresh-wallet dominance requires manual verification.
- Smart holder context can improve confidence.
- KOL presence can improve narrative reach but should not override hard stops.
- Missing hard-stop fields cap confidence. Do not replace missing hard-stop
  fields with guesses.

## Output Rules

- Do not dump raw JSON unless the user asks.
- Do not reveal secret values.
- Do not request account keys, wallet keys, or signing material.
- Refer to ANIMEME trend data as `Now Attention`, `Attention Spotlight`, or
  `Narrative Learning`.
- Explicitly say when data is missing.
- If a hard stop is present, stop escalation and explain why.

## Memory

Only write memory after the user clones this repo and starts using it. Do not
store secrets, cookies, API keys, or wallet material.
