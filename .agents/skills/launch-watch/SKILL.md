---
name: launch-watch
description: Create a read-only watch loop for a topic that may become a launch narrative.
---

# Launch Watch

Use when the user asks for a monitoring loop around a selected trend.

Workflow:

1. Run `npm run watch -- --topic <topic-id>`.
2. Use 15-minute scan intervals by default.
3. Watch board rank persistence, 1h inflow, liquidity, lead-token market cap, and source links.
4. Stop if the topic disappears from rising/latest/viral boards.

This skill is read-only and advisory.
