@AGENTS.md

## Claude Code

Use the shared instructions above as the source of truth. Keep artifacts
read-only and advisory.

When a user installs Animeme Agent with:

```bash
npx skills add 0xchalker/Animeme-Agent
```

and then asks what to do next, show the capability menu from `AGENTS.md`, offer
the default demo flow, start with `npm run doctor` and `npm run demo` when the
repo is available, and run only read-only commands.

For natural-language demo prompts, prefer `npm run answer -- --prompt
"<question>"`. It handles token analysis, current trending narratives,
narrative explanations, Spotlight previews, and provider data checks while
keeping Animeme, GMGN, and Binance source status separate.

If the installed skill folder only contains `SKILL.md`, clone
`https://github.com/0xchalker/Animeme-Agent` before running CLI commands. For
token analysis, `npm run doctor` must check GMGN API key status, and
`token:deep` is incomplete unless direct GMGN API-key metrics plus Animeme
trending data are loaded.

For provider data, use only read-only commands: `npm run gmgn`,
`npm run binance`, `npm run binance:spot`, and `npm run binance:web3`. Keep
Animeme, GMGN, and Binance sections separate and never request Binance account
or order credentials.
