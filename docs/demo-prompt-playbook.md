# Animeme Demo Prompt Playbook

Use this when recording a demo or when a user asks Animeme questions in normal
language. The default command is:

```bash
npm run answer -- --prompt "<user question>"
```

If the local npm shell strips `--prompt`, use:

```bash
npm run answer -- "<user question>"
```

## Core Demo Prompts

| User prompt | Route | What the answer should include |
| --- | --- | --- |
| `Phân tích token X` | token | Quick verdict, score, live Animeme match, GMGN hard-stop fields, Binance context, warnings, next prompts. |
| `Token X có an toàn không?` | token | Same token answer, with stronger emphasis that no token is guaranteed safe. |
| `Trending Narrative hiện là gì?` | trending | Current Now Attention ranking, top narrative summary, lead token, and follow-up prompt. |
| `Narrative X nói về cái gì?` | narrative | Plain-language explanation, live status, lead token, learning archive match, Spotlight signal keys. |
| `GMGN và Binance data của X` | provider | Separate Animeme, GMGN, and Binance sections. |
| `Attention Spotlight đang highlight gì?` | spotlight | Current Spotlight preview, recent notifications, and how to continue into token analysis. |

## Extra User Cases To Support

| Prompt shape | Recommended handling |
| --- | --- |
| `Topic nào đang rising mạnh nhất?` | Route to trending and rank live Now Attention. |
| `Narrative X còn hot không?` | Route to narrative, then emphasize live match status, rank, score, and inflow. |
| `Có token nào lead narrative X không?` | Route to narrative and show the lead token if a live topic matches. |
| `So sánh X với narrative đang hot` | Run `answer` for trending, then `answer` for `Narrative X...`; compare rank, score, summary, and token surface. |
| `Token X có bị insider/bundler không?` | Route to token; require GMGN API-key metrics and call out missing hard-stop fields. |
| `Show raw provider data for X` | Route to provider or run `gmgn` / `binance` if raw JSON is explicitly requested. |
| `Animeme có học được gì từ X?` | Route to narrative; use Narrative Learning matches first. |
| `Tôi nên watch gì tiếp?` | Route to trending and return next prompts, not a trade instruction. |

## Response Standard

Good demo answers are short but complete:

1. Direct answer first.
2. Data sources used.
3. Signal read.
4. Warnings, hard stops, or missing data.
5. Next prompt or command.

Token answers must never skip source status. If GMGN is missing, partial, or
failed, say the token is not fully cleared. If Binance is unavailable, keep the
token analysis based on Animeme and GMGN but mark Binance as missing support.
