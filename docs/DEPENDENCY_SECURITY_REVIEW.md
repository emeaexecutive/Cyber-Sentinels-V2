# Dependency Security Review

Audit date: 2026-07-12. Commands: `npm audit --json`, `npm outdated --json`, and `npm ls` against the committed lockfile. No forced audit repair was used.

## Vulnerability decisions

| Package | Relationship | Severity | Runtime surface / production relevance | Patched version | Breaking risk | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| `js-yaml` 4.1.1 | Transitive through ESLint tooling | Moderate, quadratic merge-alias processing | Development lint configuration; repository does not parse customer YAML through this dependency | 4.1.2 | Low | Upgraded lockfile resolution to 4.1.2. Finding cleared. |
| `postcss` 8.4.31 | Transitive, bundled under Next.js | Moderate, unescaped `</style>` during CSS stringify | Production build/render dependency. Relevance depends on untrusted text reaching CSS stringify; no such application path was identified, but exposure is not hidden. | 8.5.10+ according to advisory | High if overriding Next's pinned internal dependency | Deferred. npm reports the parent `next` finding and proposes a breaking downgrade rather than a compatible repair. Track upstream; do not force an override. |
| `next` 15.5.20 | Direct | Moderate, inherited from bundled PostCSS | Core production framework | No compatible npm-audit remediation reported for the installed release | High | Updated within the existing 15.5 line from 15.5.18 to 15.5.20, aligned ESLint config, verified gates, and retained the residual finding for upstream remediation. |

Post-change audit result: 2 moderate, 0 high, 0 critical. A non-zero audit result is a release risk, not a hidden or suppressed result.

## Deprecated and outdated package decisions

| Package | Direct / transitive | Installed | Latest observed | Surface | Decision |
| --- | --- | --- | --- | --- | --- |
| `@worldcoin/idkit` | Direct | 1.5.0 | 4.2.0 | Optional World ID proof-of-personhood work; current server exchange is explicitly not implemented and runtime source does not import the SDK | Defer major migration. Removing or jumping three majors without a connected flow would not prove compatibility. |
| `@supabase/ssr` | Direct | 0.5.2 | 0.12.0 | Auth/session middleware | Defer major upgrade; requires dedicated cookie/session regression work. |
| `react` / `react-dom` | Direct | 19.0.0 | 19.2.7 | Entire UI runtime | Defer coordinated framework upgrade. |
| `lucide-react` | Direct | 0.468.0 | 1.24.0 | UI icons | Defer major; no security finding. |
| `tailwindcss` | Direct dev | 3.4.17 | 4.3.2 | Styling build | Defer major configuration migration. |
| `typescript` | Direct dev | 5.9.3 resolved | 7.0.2 | Type checking | Defer major compiler migration. |
| Supabase JS, Stripe, types, PostCSS/autoprefixer and ESLint | Direct | Patch/minor updates available | See audit snapshot | Auth, billing or build tooling | Defer unrelated churn after verified targeted upgrades; schedule normal dependency maintenance. |

## World ID staged migration

1. Confirm the approved World ID use case and data/region contract.
2. Implement and test server-side provider verification behind the existing adapter and protected route.
3. Build a v1-to-v4 SDK API/React compatibility matrix; do not treat a client proof as verified.
4. Add provider contract, timeout, replay/evidence and auth regression tests.
5. Upgrade in an isolated change, demonstrate `Awaiting Credentials` and unavailable paths, then remove obsolete v1 code/dependency only after production verification.
