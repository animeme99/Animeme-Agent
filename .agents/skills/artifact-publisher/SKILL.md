---
name: artifact-publisher
description: Package scan, thesis, risk, or watch outputs into local JSON/Markdown artifacts.
---

# Artifact Publisher

Use after generating any scan, thesis, risk review, or watch plan.

Rules:

- Write artifacts only under `artifacts/`.
- Produce both JSON and Markdown when possible.
- Include `createdAt`, `contextGeneratedAt`, `kind`, and selected topic data.
- Never write secrets, browser sessions, wallet keys, or private credentials.

Recommended file naming:

```text
artifacts/<iso-timestamp>-<kind>-<topic-slug>.json
artifacts/<iso-timestamp>-<kind>-<topic-slug>.md
```
