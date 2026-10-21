# GTM workflow operating policy

Status: human-supervised, founder-review workflow. No agent has publishing,
account, shell, repository-write or spending authority.

## Permission and budget boundaries

- The six `.github/agents/*.agent.md` profiles use only read/search/web tools;
  Editorial and Distribution are limited to read/search.
- No agent has `edit`, `execute`, `agent`, wildcard, GitHub mutation, CMS,
  analytics-account or provider tools.
- The external-spend cap is USD 0 per run. No paid research, ads, purchased
  links, paid directories or paid APIs are authorized.
- Agent frontmatter is a least-privilege configuration, not a billing or
  operating-system sandbox. Copilot plan usage is governed by the operator's
  existing subscription and cannot be hard-capped by these files. Do not use
  agents if the existing plan would incur unapproved incremental charges.
- Research may use anonymous, publicly accessible sources only. No credentials,
  Search Console/Bing account access, customer data or non-public evidence may
  be supplied to an agent.

## Approval gates

Founder approval is required before:

1. publishing or merging public marketing content;
2. posting, replying, messaging, submitting directory listings or contacting
   communities;
3. changing Search Console, Bing Webmaster Tools, analytics tags, robots policy
   or site ownership verification;
4. submitting URLs to search engines or enabling IndexNow;
5. purchasing tools, research, ads or listings; or
6. making claims about hosted availability, Production qualification, customers,
   pricing, compliance, awards or measured results.

PR creation and local validation are allowed. A preview, local build, source
test or search result is not Production deployment, account ownership, indexing
or a customer outcome.

## Human-operated cycle

1. Market Intelligence and GEO return dated evidence, sources and uncertainty.
2. Technical SEO returns read-only findings and exact URLs; a human implements
   and tests any change in a separate branch.
3. Editorial returns original copy and metadata suggestions. Drafts remain in
   `docs/gtm/drafts/` with `founder-review` status.
4. Run `npm run gtm:validate` before founder review. If approved, change the
   queue status to `founder-approved` and record the approver, date and an
   auditable approval reference. This does not publish the draft.
5. Record approval in the queue, create a content-only PR, and run required
   checks. Do not merge or deploy until authorized through the normal release
   path.
6. Distribution drafts remain unpublished. Analytics uses only public data or
   owner-provided, sanitized exports and marks absent evidence NOT_MEASURED.

The validator checks queue state and tool allowlists. It does not publish
content, access accounts, enforce billing, or replace human review.
