# ANIMEME Token Intelligence Playbook

Use this playbook when an agent needs to judge whether a token is worth deeper
research.

## Public Documentation Rule

Keep this playbook ANIMEME-only. Do not expose upstream provider endpoints,
upstream route paths, adapter internals, credential names, or private
infrastructure details.

## Inputs

- Token address.
- Live attention matches from Now Attention.
- ANIMEME token context.
- Narrative Learning matches.
- Attention Spotlight/topic history when the token is attached to a topic.
- Missing-data status.
- Hard-stop status.

## Required Context

Complete token due diligence requires:

- ANIMEME live attention context.
- ANIMEME token context.
- ANIMEME learning context when available.
- Explicit missing-data reporting.
- Explicit hard-stop reporting.

If required hard-stop fields are missing, keep the analysis incomplete and do
not clear the token.

## Commands

```bash
npm run answer -- --prompt "Analyze token <token-address>"
npm run answer -- --prompt "Is token <token-address> safe?"
npm run doctor
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
npm run topics -- --token <token-address>
```

Use `answer` for user-facing demo prompts. It produces a concise response and
loads the same token workflow. Use lower-level commands when the user asks for
artifact inspection or a more structured report.

## Verdicts

- `researchable`: enough clean signals to continue research.
- `watch`: mixed signals or incomplete data.
- `high-risk`: weak attention and poor or incomplete context.
- `avoid`: hard-stop concentration or manipulation risk.

## Hard Stops

- Top-holder concentration above the hard-stop threshold.
- Creator/dev concentration above the hard-stop threshold.
- Insider pressure above the hard-stop threshold.
- Bundled activity above the hard-stop threshold.
- Required hard-stop fields are missing and cannot be verified.

## Warnings

- No live ANIMEME attention match.
- Public ANIMEME connectivity is degraded.
- Required token context is missing.
- Partial token context is missing hard-stop fields.
- Top-holder concentration is elevated.
- Creator/dev concentration is elevated.
- Insider pressure is elevated.
- Bundled activity is elevated.
- Fresh-wallet dominance is elevated.
- Smart holder context is weak or absent.

## Analysis Order

1. Validate the token address shape.
2. Load ANIMEME public context.
3. Check live attention match.
4. Check Narrative Learning match.
5. Check Attention Spotlight context.
6. Check ANIMEME token context.
7. Apply warnings and hard stops.
8. Produce one verdict.
9. Write artifacts.
10. Recommend the next research command, not a trade.

## Output Policy

- Say what is missing.
- Keep the output advisory.
- Do not reveal backend adapter names in user-facing artifacts.
- Do not print secrets or write them to artifacts.
- Do not say a token is guaranteed safe.
- Do not use missing data as positive evidence.

## Recommended Answer Shape

```text
Verdict: watch
Confidence: medium
Score: 54/100

Why it matters:
- The token has a live ANIMEME attention match.
- The narrative is readable.
- The learning match is partial.

Warnings:
- Required hard-stop context is incomplete.
- Crowd context is not fully cleared.

Next:
- Run a thesis on the matched topic.
- Keep the token in watch mode until missing context is resolved.
```
