# AGENT_LOG

How I directed the coding agent on DocsDryRun, and what I checked or changed myself.

## Setup

- Scaffolded with `npx deepspace`. The repo includes the DeepSpace agent skill (`.agents/skills/deepspace`, `AGENTS.md`, `CLAUDE.md`), so the agent worked from the platform's own docs.
- I used a coding agent for implementation and made the product and security decisions myself. Commit history is in `git log`.

## Decisions I made (not the agent)

1. **The core rule.** Findings are only useful if they can be trusted, so every finding must quote the page, and code drops any quote that is not on it. The model is not trusted to check its own output.
2. **Scope.** Single-page audits, one shared board, a 10-audit cap per account. Left out on purpose: multi-page crawl, re-run diffs, notifications, extra integrations.
3. **Two integrations only.** `firecrawl/scrape` fetches the page as markdown and `anthropic/chat-completion` finds the problems. Nothing else in the product needed an integration, so I did not add any.
4. **Permissions.** Clients cannot create audits or findings and cannot edit finding content (those columns are `immutable`). Members can only change `status` and `claimedBy`. Only the server action writes content.
5. **Cost control.** Integrations are billed to the app owner, so I cap audits per account and pin the model to `claude-haiku-4-5`, because the integration default is a far more expensive model.
6. **Untrusted input.** The fetched page is treated as data. The prompt tells the model to ignore instructions inside it, and the quote check limits what an injected page can make the app display.

## What the agent did

- Scaffold wiring: auth, routing, realtime sync and UI primitives (from the DeepSpace template).
- First pass of `src/lib/audit.ts` (prompt, parser, scoring, URL validation) and `src/lib/audit.test.ts`.
- First pass of `src/actions/index.ts` (`startAudit`), `src/schemas/audits-schema.ts`, and `src/pages/(app)/(protected)/audits.tsx` (audit list and the claim / fix / dismiss board). These landed together in one commit.

## What I verified or changed myself

- **Real responses, not guesses.** I captured real Firecrawl and Anthropic responses with `integrations invoke` and wrote the response-path helpers (`pageMarkdown`, `replyText`) from those shapes. The samples are kept locally and gitignored.
- **Ran the pipeline end to end** after the first commit and fixed what I found in follow-up commits:
  - Audit titles now use `hostname + path` instead of the first `#` heading.
  - Set `temperature: 0` for more consistent repeat runs. The score still varies somewhat between runs.
- **Unit tests** in `src/lib/audit.test.ts` cover: invented quotes are dropped, fenced or garbage model output is handled, the score never goes below 0, and URL validation rejects http, localhost, IPs and junk. Run with `npx vitest run src/lib/audit.test.ts`.
- **Secrets.** `.dev.vars` and other local config are gitignored and not tracked.
- **Reviewed my own code for gaps** and listed them honestly below rather than hiding them.

## Known limitations

- The quote check proves a quote is real, not that the model's claim about it is true.
- The score varies between runs and is a rough signal, not a metric.
- Single page per audit.
- `claimedBy` is written from the client, so a member could set it to another user's ID. Two people claiming at once is last-write-wins.
- An audit can stay in `running` if the worker dies mid-run. There is no timeout or recovery.
- The browser-facing `/api/integrations/:name/:endpoint` route comes from the scaffold and forwards developer-billed integrations (`firecrawl`, `anthropic`) without requiring sign-in. The 10-audit cap lives in the server action, so it does not protect that route. Planned fix: reject developer-billed integrations on that route, since the app only calls them server-side.
- The per-account cap filters audits by `ownerId`, which is not declared in `auditsSchema`. I have not confirmed it counts per user.
- Automated tests cover the pure logic. There are no tests yet for the claim flow between two users or for RBAC enforcement.
- The UI is intentionally plain. I spent the time on correctness and permissions.

## What I would do next

1. Block the open integration route and add a test that an unauthenticated call is refused.
2. Confirm and, if needed, fix the per-account cap.
3. Validate claims on the server (set `claimedBy` from the authenticated user, reject conflicting claims).
4. Add a timeout and recovery for stuck audits.
5. Add tests for the claim flow and RBAC enforcement.
6. Multi-page audits that follow links from a quickstart, then re-run diffs to show what got fixed.
