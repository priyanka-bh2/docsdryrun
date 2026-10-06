# DocsDryRun

Paste a docs URL. The app reads the page as a first-time developer and lists where they would get stuck. Every finding must quote the page, and code drops any quote that is not really on it. Findings sit on a live shared board where teammates claim, fix or dismiss them.

**Live:** https://docsdryrun-priyanka.app.space
**Built on:** DeepSpace SDK (auth, RBAC records, real-time sync, server actions) + `firecrawl/scrape` + `anthropic/chat-completion` (Haiku).

## How it works
1. `POST /api/actions/startAudit` validates the URL, enforces a 10-audit cap per account, and creates the audit.
2. Firecrawl fetches the page as markdown.
3. Claude returns findings as JSON.
4. `parseFindings` keeps a finding only if its quote appears on the page.
5. Findings are saved and appear live for everyone via record sync.

## Trust rules
- Clients cannot create audits or findings, and cannot edit a finding's content. Only the server action writes them.
- Members can change only triage fields (`status`, `claimedBy`).
- The model name is set explicitly (the integration default is a costlier model).

## Where things are
| Path | What |
|---|---|
| `src/lib/audit.ts` | prompt, parser, quote check, score, URL validation (+ tests) |
| `src/actions/index.ts` | `startAudit` server action |
| `src/schemas/audits-schema.ts` | collections and RBAC |
| `src/pages/(app)/(protected)/audits.tsx` | the audits page and board |
| `AGENT_LOG.md` | what the AI did and what I verified |

## Run it
Node 22.15+ / 24 and npm 11.6+.
    npm install
    npx deepspace auth login
    npx deepspace dev start
    npx vitest run src/lib/audit.test.ts

## Limitations
The quote check proves a quote is real, not that the model's claim is true. The score varies between runs. Single-page audits only. See `AGENT_LOG.md`.
