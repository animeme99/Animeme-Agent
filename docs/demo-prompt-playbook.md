# ANIMEME Demo Prompt Playbook

Use this when recording a demo or when a user asks ANIMEME questions in normal
language.

The default command is:

```bash
npm run answer -- --prompt "<user question>"
```

If the local npm shell strips `--prompt`, use:

```bash
npm run answer -- "<user question>"
```

## Public Documentation Rule

Keep all public examples in English. Keep every data reference ANIMEME-only.
Do not expose upstream provider endpoint names, route paths, credential names,
or adapter internals.

## Core Demo Prompts

| User Prompt | Route | What The Answer Should Include |
| --- | --- | --- |
| `Analyze token X` | token | Quick verdict, score, live ANIMEME match, warnings, hard stops, missing data, and next prompt. |
| `Is token X safe?` | token | Advisory verdict, explicit uncertainty, hard-stop status, and reminder that no token is guaranteed safe. |
| `What narrative is trending right now?` | trending | Current Now Attention ranking, top narrative summary, lead token context, and follow-up prompt. |
| `What is narrative X about?` | narrative | Plain-language explanation, live status, learning match, and Spotlight context when available. |
| `What is Attention Spotlight showing?` | spotlight | Current Spotlight preview, recent signal context, and how to continue into thesis or token analysis. |
| `What should I watch next?` | watch | Highest-priority topic, watch conditions, invalidation rules, and next command. |
| `Show me what ANIMEME can do` | onboarding | Capability menu, doctor check, demo flow, and artifact summary. |

## Extra User Cases To Support

| Prompt Shape | Recommended Handling |
| --- | --- |
| `Which topic is rising fastest?` | Route to trending and rank live Now Attention. |
| `Is narrative X still hot?` | Route to narrative, then emphasize live match status, rank, score, and inflow. |
| `Does narrative X have a lead token?` | Route to narrative and show lead token context when a live topic matches. |
| `Compare X with the current top narrative` | Run current trending, then narrative search for X; compare rank, score, catalyst clarity, and token surface. |
| `Does token X have insider or bundled risk?` | Route to token; require hard-stop context and call out missing fields. |
| `What did ANIMEME learn from X?` | Route to narrative and use Narrative Learning matches first. |
| `Create a thesis for the strongest topic` | Run scan, choose topic, then run thesis and risk artifacts. |
| `What is the next command?` | Suggest the most specific command based on the current question. |

## Response Standard

Good demo answers are short but complete:

1. Direct answer first.
2. ANIMEME context used.
3. Signal read.
4. Warnings, hard stops, or missing data.
5. Next prompt or command.

Token answers must never skip source status. Missing data is not bullish. If
required hard-stop context is missing, say the token is not fully cleared and
keep the verdict conservative.

## Demo Voice

Use product language that sounds like ANIMEME:

- attention before chart
- meme behind the move
- early, rising, crowded, weak, real heat
- catalyst clarity
- narrative memory
- spotlight context
- watch conditions
- hard stops

Avoid:

- guaranteed calls
- financial advice
- generic hype
- provider explanations
- raw endpoint walkthroughs
- untranslated examples
