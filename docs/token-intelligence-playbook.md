# Animeme Token Intelligence Playbook

Use this playbook when an agent needs to judge whether a token is worth deeper
research.

## Inputs

- Token address.
- Live attention matches from Now Attention.
- Neutral market metrics from Animeme public routes.
- Learning archive matches.
- Optional Spotlight/topic history when the token is attached to a topic.

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
- No neutral market metrics yet.
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
- Do not say a token is guaranteed safe.
