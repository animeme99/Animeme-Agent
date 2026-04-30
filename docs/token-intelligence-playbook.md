# Animeme Token Intelligence Playbook

Use this playbook when an agent needs to judge whether a token is worth deeper
research.

## Inputs

- Token address.
- Live attention matches from Now Attention.
- Direct GMGN API-key market metrics.
- Animeme public market fallback metrics.
- Learning archive matches.
- Optional Spotlight/topic history when the token is attached to a topic.

## Required Data Sources

Complete token due diligence requires both:

- Animeme trending context from Now Attention, plus Learning/Spotlight when
  available.
- GMGN API-key token metrics for top-10 holder share, creator/dev holding,
  insider pressure, and bundled activity.

Configure GMGN with `GMGN_API_KEY` or `~/.config/gmgn/.env`. `npm run doctor`
checks whether the key is configured without printing it. If the key is missing
or GMGN returns partial metrics, keep the analysis incomplete and do not clear
hard-stop checks.

## Commands

```bash
npm run doctor
npm run token -- --address <token-address>
npm run token:deep -- --address <token-address>
npm run topics -- --token <token-address>
```

## Verdicts

- `researchable`: enough clean signals to continue research.
- `watch`: mixed signals or incomplete data.
- `high-risk`: weak attention and poor/incomplete metrics.
- `avoid`: hard-stop concentration or manipulation risk.

## Hard Stops

- Top-10 holder share above 50%.
- Creator/dev holding share above 30%.
- Insider share above 30%.
- Bundled activity above 35%.

## Warnings

- No live Animeme attention match.
- Public API connectivity is degraded.
- No GMGN API-key market metrics yet.
- Partial GMGN response missing required hard-stop fields.
- Top-10 holder share above 20%.
- Creator/dev holding share above 10%.
- Insider share above 10%.
- Bundled activity above 15%.
- Fresh-wallet share above 70%.
- Smart holder count is zero.

## Output Policy

- Say what is missing.
- Keep the output advisory.
- Do not reveal backend adapter names in user-facing artifacts.
- Do not print API keys or write them to artifacts.
- Do not say a token is guaranteed safe.
