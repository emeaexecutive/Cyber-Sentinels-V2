# Dependency update policy

## General controls

- Start from a clean, synchronized `origin/main` and use a dedicated branch.
- Use Node 22.x and the repository's pinned npm 10 release.
- Generate `package-lock.json` through npm and reject unrelated lock churn.
- Run focused compatibility tests, full lint/type/test/build, Gitleaks and hosted preview checks.
- Never auto-merge, run `npm audit fix`, weaken CSP/scanners, or mix product features into dependency work.

## Update classes

### Patch updates

Group by subsystem where packages share a compatibility boundary. Require focused tests and the complete mandatory check set in a normal PR.

### Minor updates

Require release-note and compatibility review, focused regression tests, full build, route generation and deployment-preview validation.

### Major updates

Use a dedicated branch with a migration plan, rollback plan, manual review and explicit owner approval. Never combine unrelated majors.

### Security updates

Assess severity, dependency path and runtime reachability. Use an urgent path only when exploitable. Do not blindly auto-merge or claim remediation until the final graph proves it.

### Framework updates

Coordinate runtime and type packages. Validate hydration, Server/Client Components, Server Actions, authentication, forms, static/dynamic/API routes, browser navigation and preview deployment.

### Payment updates

Keep isolated within the baseline. Review the SDK-pinned API version, webhooks, raw-body signatures, idempotency, checkout, portal, subscriptions, test-mode behavior and safe failures. Live success requires credentials and explicit evidence.

## Compatibility groups

- React ecosystem: React, React DOM and both type packages.
- CSS toolchain: PostCSS, Autoprefixer and Tailwind CSS.
- GitHub security actions: Gitleaks and CodeQL, preserving immutable pins.
- Payment: Stripe remains ungrouped from all unrelated dependencies.
