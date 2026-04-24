---
name: narrative-thesis
description: Turn a selected Animeme topic into a concise meme narrative thesis.
---

# Narrative Thesis

Use when the user asks why a topic matters, what meme story is forming, or how
to explain a trend.

Workflow:

1. Run `npm run thesis -- --topic <topic-id>`.
2. Anchor the thesis to live Animeme fields: board mode, rank, token count, and inflow.
3. State what would invalidate the thesis.
4. Keep output concise enough to publish as a local artifact.

Output shape:

- One-sentence thesis.
- Three signals.
- One invalidation condition.
- One next agent task.
