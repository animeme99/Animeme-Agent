---
name: trend-scout
description: Use Animeme public context to identify current meme attention trends and pick watch candidates.
---

# Trend Scout

Use when the user asks what is trending now or wants an agent-ready scan.

Workflow:

1. Run `npm run scan`.
2. Prefer topics from `spotlight` or top 5 `rising` board entries.
3. Pick one candidate only if it has a readable narrative, linked token data, and non-zero 1h inflow.
4. Write the output under `artifacts/`.

Rules:

- This is advisory, not trading execution.
- Do not ask for private keys or wallet access.
- If live context is unavailable, report degraded status and stop.
