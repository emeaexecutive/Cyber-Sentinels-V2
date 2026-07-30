# NPM Audit Review - 2026-07-30

## Scope and safety

This review was performed locally on Node.js `22.23.1` with npm `10.9.8`.
No automatic audit fix, dependency-wide upgrade, Production command, database
operation, or deployment was run. Raw JSON reports are stored outside the
repository under `Desktop\cyber-sentinels-security-audit` and are not release
artifacts.

## Summary

| Measure | Result |
|---|---:|
| `npm audit` vulnerability objects | 17 |
| High severity | 17 |
| Critical severity | 0 |
| Direct vulnerability objects | 6 |
| Transitive vulnerability objects | 11 |
| `npm audit --omit=dev` vulnerability objects | 7 |
| Production-reachable vulnerability objects | 0 |
| Development-only vulnerability objects | 10 |
| Objects for which npm proposes a semver-major fix | 10 |
| Root advisories represented | 2 |

The 17 objects are dependency-graph effects of two root advisories:

1. `brace-expansion` unbounded expansion can cause an out-of-memory
   denial-of-service condition (`GHSA-mh99-v99m-4gvg`).
2. PostCSS previous-source-map auto-loading can traverse paths and disclose an
   arbitrary `.map` file when PostCSS processes attacker-controlled CSS
   (`GHSA-r28c-9q8g-f849`).

No Cyber Sentinels runtime path accepts untrusted CSS and sends it to PostCSS.
PostCSS is used by the local/CI CSS build pipeline. It is also present beneath
`next` and the unused World ID dependency tree, which is why npm retains seven
objects when development dependencies are omitted. Presence in that graph is
not evidence of runtime reachability.

## Package-level assessment

| Package | Installed version | Relationship | Vulnerable path / root cause | Production classification | Fix assessment | Recommended action |
|---|---|---|---|---|---|---|
| `@eslint/config-array` | `0.21.2` | Transitive via direct `eslint` | `minimatch` -> `brace-expansion` | DEVELOPMENT ONLY; TRANSITIVE | npm proposes ESLint 10 major | Upgrade the ESLint ecosystem in separate dependency work |
| `@eslint/eslintrc` | `3.3.5` | Transitive via direct `eslint` | `minimatch` -> `brace-expansion` | DEVELOPMENT ONLY; TRANSITIVE | npm proposes ESLint 10 major | Same coordinated ESLint upgrade |
| `autoprefixer` | `10.4.20` | Direct dev dependency | Shared vulnerable `postcss` | DEVELOPMENT ONLY; BUILD TOOLING ONLY | Non-breaking PostCSS patch is available | Validate a focused PostCSS patch separately |
| `brace-expansion` | `1.1.16`, `5.0.7` | Transitive | Direct root advisory through `minimatch` | DEVELOPMENT ONLY; TRANSITIVE | npm proposes ESLint 10 major | Do not process attacker-controlled glob patterns; coordinate upgrades |
| `eslint` | `9.39.4` | Direct dev dependency | `minimatch` -> `brace-expansion` | DEVELOPMENT ONLY; BUILD TOOLING ONLY | REQUIRES BREAKING UPGRADE according to npm | Separate ESLint 10 compatibility pass |
| `eslint-config-next` | `15.5.21` | Direct dev dependency | ESLint plugins -> `minimatch` | DEVELOPMENT ONLY; BUILD TOOLING ONLY | npm proposes Next config 16 major | Upgrade only with the Next 16 compatibility program |
| `eslint-plugin-import` | `2.32.0` | Transitive | `minimatch` -> `brace-expansion` | DEVELOPMENT ONLY; TRANSITIVE | npm marks a major-path fix | Resolve with coordinated lint-stack upgrade |
| `eslint-plugin-jsx-a11y` | `6.10.2` | Transitive | `minimatch` -> `brace-expansion` | DEVELOPMENT ONLY; TRANSITIVE | npm proposes major-path fix | Resolve with coordinated lint-stack upgrade |
| `eslint-plugin-react` | `7.37.5` | Transitive | `minimatch` -> `brace-expansion` | DEVELOPMENT ONLY; TRANSITIVE | Transitive upgrade required | Resolve with coordinated lint-stack upgrade |
| `minimatch` | `3.1.5`, `10.2.5` | Transitive | `brace-expansion` root advisory | DEVELOPMENT ONLY; TRANSITIVE | npm proposes ESLint 10 major | Resolve through parent upgrades; do not force an override in this hotfix |
| `next` | `15.5.21` | Direct Production dependency | Bundled/shared `postcss@8.5.14` | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; BUILD TOOLING ONLY | npm's suggested downgrade to Next 9 is unsafe; PostCSS has a patch | Keep Next pinned; validate PostCSS `>=8.5.18` separately |
| `postcss` | `8.5.14` | Direct dev dependency and transitive under `next` | Direct root advisory | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; BUILD TOOLING ONLY | Non-breaking patch line begins after `8.5.17`; current registry latest observed was `8.5.25` | Prepare a focused, tested patch update; do not use `npm audit fix --force` |
| `postcss-import` | `15.1.0` | Transitive via `tailwindcss` | Shared vulnerable `postcss` | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; TRANSITIVE; BUILD TOOLING ONLY | Parent/shared PostCSS patch | Resolve with focused PostCSS patch |
| `postcss-js` | `4.1.0` | Transitive via `tailwindcss` | Shared vulnerable `postcss` | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; TRANSITIVE; BUILD TOOLING ONLY | Parent/shared PostCSS patch | Resolve with focused PostCSS patch |
| `postcss-load-config` | `4.0.2` | Transitive via `tailwindcss` | Shared vulnerable `postcss` | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; TRANSITIVE; BUILD TOOLING ONLY | Parent/shared PostCSS patch | Resolve with focused PostCSS patch |
| `postcss-nested` | `6.2.0` | Transitive via `tailwindcss` | Shared vulnerable `postcss` | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; TRANSITIVE; BUILD TOOLING ONLY | Parent/shared PostCSS patch | Resolve with focused PostCSS patch |
| `tailwindcss` | `3.4.17` | Direct dev dependency; also under World ID forms | Shared vulnerable `postcss` | PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE; BUILD TOOLING ONLY | PostCSS patch available; Tailwind major is not required for this advisory | Keep the Tailwind major stable and validate the PostCSS patch |

## Reachability decision

### Brace expansion

The affected paths are lint/parser tooling. They are not bundled into the
application runtime and no application endpoint exposes ESLint or repository
glob evaluation to a remote caller.

Classification:

```text
DEVELOPMENT ONLY
BUILD TOOLING ONLY
TRANSITIVE
REQUIRES BREAKING UPGRADE
```

### PostCSS

Cyber Sentinels processes its own checked-in CSS during builds. Repository
search found Tailwind directives and build configuration, but no runtime
feature that processes user-supplied CSS or source maps. The vulnerable package
is retained in the Production dependency graph through `next` and the World ID
tree, but the vulnerable operation is not currently reachable from application
requests.

Classification:

```text
PRODUCTION PRESENT BUT NOT CURRENTLY REACHABLE
BUILD TOOLING ONLY
TRANSITIVE
NEEDS MANUAL REVIEW
```

The safe remediation candidate is a focused PostCSS patch to at least `8.5.18`,
followed by the complete local validation suite. That package change is outside
this containment hotfix because it was not automatically selected or tested as
part of the incident-recovery instructions.

## World ID deprecation review

`@worldcoin/idkit@1.5.0` is a direct dependency and
`@worldcoin/idkit-core@1.5.0` is transitive. Registry metadata for those exact
versions says that old versions moved to new ones. The current versions
observed were `4.2.1` and `4.2.2`, respectively.

No runtime source file imports `@worldcoin/idkit`. Existing World ID routes are
explicitly placeholder-only, fail closed, and do not perform server
verification. Moving from v1 to v4 is a multi-major API and integration change,
not a safe incident-containment edit.

```text
SEPARATE DEPENDENCY MODERNISATION WORK REQUIRED
```

Recommended path:

1. confirm the approved World ID use case and regional/data contract;
2. design and implement server-side provider verification;
3. migrate the client SDK in an isolated branch;
4. prove fail-closed behavior and normalized evidence mapping;
5. remove the dependency if the integration remains out of scope.

World ID upgrade performed during this recovery: **NO**.
