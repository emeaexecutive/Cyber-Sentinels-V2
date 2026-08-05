# Dependabot PR #18–#24 review plan

These updates are deliberately excluded from Epic 34. They must be tested on dedicated dependency branches and must not be merged automatically.

| Group | Pull requests | Review together | Required evidence |
| --- | --- | --- | --- |
| A — security workflow actions | #18 Gitleaks Action; #24 CodeQL Action | Only when their workflow edits are compatible | Deliberate pinning, least-privilege permissions, successful hosted security workflows, and no weakened action source |
| B — CSS toolchain | #21 PostCSS; #23 Autoprefixer | Yes, on one CSS dependency branch | Stable build output, rendered CSS review, unchanged CSP/production headers, and no source-map regression |
| C — React framework | #20 React DOM/types; #22 React/types | Yes; never merge one without the other | Next.js compatibility, hydration, server/client boundaries, forms, Turnstile, full build, and documented production smoke plan |
| D — Stripe | #19 Stripe | No; review separately | Signature verification, checkout, subscriptions, billing portal, pinned API-version expectations, event fixtures, idempotency, and test-mode smoke |

All seven PRs were open when Epic 34 began. PRs #18, #21, #22, #23, and #24 were merged externally while Epic 34 was in progress; Epic 34 did not merge or modify those pull requests. After rebasing, the isolated #22 React update left `react` at 19.2.8 and `react-dom` at 19.0.0, which Next.js rejected during page-data collection. This branch therefore aligns `react-dom` to the exact 19.2.8 companion release in a separate compatibility commit. PRs #19 and #20 remain independent review items, and the Production smoke plan remains required before any release.
