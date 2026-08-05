# Dependabot PR #18–#24 review plan

These updates are deliberately excluded from Epic 34. They must be tested on dedicated dependency branches and must not be merged automatically.

| Group | Pull requests | Review together | Required evidence |
| --- | --- | --- | --- |
| A — security workflow actions | #18 Gitleaks Action; #24 CodeQL Action | Only when their workflow edits are compatible | Deliberate pinning, least-privilege permissions, successful hosted security workflows, and no weakened action source |
| B — CSS toolchain | #21 PostCSS; #23 Autoprefixer | Yes, on one CSS dependency branch | Stable build output, rendered CSS review, unchanged CSP/production headers, and no source-map regression |
| C — React framework | #20 React DOM/types; #22 React/types | Yes; never merge one without the other | Next.js compatibility, hydration, server/client boundaries, forms, Turnstile, full build, and documented production smoke plan |
| D — Stripe | #19 Stripe | No; review separately | Signature verification, checkout, subscriptions, billing portal, pinned API-version expectations, event fixtures, idempotency, and test-mode smoke |

All seven PRs were open when Epic 34 began. They do not block Epic 34 because the checkout was clean and PR #25 was merged. No dependency PR is modified by this Epic.
