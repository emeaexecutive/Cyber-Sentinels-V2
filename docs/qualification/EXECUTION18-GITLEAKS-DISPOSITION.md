# Execution 18 Gitleaks disposition

PR #139 exact head: `ec9f227db5e1dbd3168132f077b72e387445e4d4`

GitHub's checkout fetches all branch refs and the synthetic PR merge ref before
running Gitleaks 8.28.0. The resulting scan covers 913 commits. Local scans
limited to PR ancestry cover fewer commits and do not reproduce the finding.

The single additional finding is the exact fingerprint:

`a9bffc15e6889e874a9f58fb523965fc45260e5c:tools/qualification/execution03-database-rehearsal.mjs:generic-api-key:63`

The historical line constructs a PostgreSQL client with a deliberately incorrect
password and asserts that SCRAM authentication rejects it. The client connects
only to the rehearsal server on `127.0.0.1:55473`, and the surrounding workflow
creates and removes local synthetic databases. The value is not a hosted,
provider, production, staging or deployment credential.

The commit is reachable from the unrelated
`codex/execution03-enforcement-20261112` branch, not from the PR #139 head
ancestry. The disposition therefore adds only the exact commit/path/rule/line
fingerprint to `gitleaks-verified-fixtures.ignore`; no path or rule is globally
excluded. Raw credential-like values are intentionally omitted from this
evidence.

Validation must reproduce GitHub's full-ref checkout and report zero findings
after the fingerprint exception. This disposition does not authorize credential
rotation, hosted changes, PR merge or deployment.
