@AGENTS.md

## Claude Code

Use the shared instructions above as the source of truth. Keep artifacts
read-only and advisory.

When a user installs ANIMEME Agent with:

```bash
npx skills add animeme99/Animeme-Agent
```

and then asks what to do next, show the capability menu from `AGENTS.md`, offer
the default demo flow, start with `npm run doctor` and `npm run demo` when the
repo is available, and run only read-only commands.

For natural-language demo prompts, prefer:

```bash
npm run answer -- --prompt "<question>"
```

It handles token analysis, current trending narratives, narrative explanations,
Spotlight previews, and watch-plan prompts while keeping the public answer
branded as ANIMEME intelligence.

If the installed skill folder only contains `SKILL.md`, clone
`https://github.com/animeme99/Animeme-Agent` before running CLI commands.

For token analysis, `npm run doctor` should confirm readiness and
`npm run token:deep -- --address <token-address>` should produce the structured
ANIMEME due-diligence report. If required hard-stop context is missing, keep
the verdict conservative and state what is missing.

Public docs and public artifacts must not expose upstream provider endpoints,
adapter internals, credential names, or private infrastructure details.
