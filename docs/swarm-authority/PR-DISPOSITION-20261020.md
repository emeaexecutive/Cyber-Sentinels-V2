# PR disposition ? 20 October 2026

The CPTO directive authorized individually qualified non-release merges and justified obsolete/superseded closures. No branch protection requires an additional review on main; absence of protection is not application-release approval. Exact head/diff/base/checks and deployment implications were reviewed. Main auto-deployment is disabled in repository Vercel configuration. The swarm branch has not absorbed these main merges.

| PR | Disposition | Reviewed head / resulting merge | Evidence and reason |
|---|---|---|---|
| #110 | MERGED | head `9ad0526777d629b538ce44fbcbba4531f0841879`; merge `a55926fdcd01dcd56fe12329dbe63c574d3bedaf` | @types/node and tsx patch tooling updates only; seven checks green, reviewed lockfile; base exactly current main |
| #97 | MERGED | head `622f6cf53a5e468e98ed60b630a702426e0b0059`; merge `577dc23932d7836593d0aafe87d6ff0472feeb1d` | Supabase CLI 2.119.0; seven checks green, official release notes reviewed, local CLI version smoke passed, merge-tree preserves #110 |
| #98 | CLOSED | head `e1b8ad76d13afb3c77b27aa0a546b34a5e5d3a19` | Independent CodeQL init upgrade mismatched analyze/autobuild; superseded by qualified #117, rationale posted |
| #101 | CLOSED | head `076eb0937552012dd224e8342415f76e84915b7f` | Independent CodeQL analyze upgrade mismatched init/autobuild; superseded by qualified #117, rationale posted |
| #117 | MERGED | head `320598db0a891abe7f10ae95b5ceaf36ed325e64`; merge `2cb8dcad232de7c4a510e6f55e92810442524f4b` | Replacement pins all three CodeQL actions to `faaca9a8f6edddba5725ffe5adefdab6669a2eca` (3.38.0). CodeQL, analyze, verify, Docker and gitleaks pass; Supabase preview skipped. Exact historical synthetic-fixture fingerprint excluded after review; 821-commit redacted local scan passed. No general secret-pattern exclusion |
| #100 | BLOCKED (open) | `3ddf30f61a981ae5c8c12e88e55a4dd9d9db3267` | Stripe requires API version 2026-08-26.dahlia; billing and identity runtime specify 2026-07-29.dahlia. Exact typecheck fails. Coordinated billing compatibility qualification required |
| #96 | BLOCKED (open) | `03e257307401b0c0d0bf37d97ae06a3d92b3da36` | CSS toolchain invariant rejects proposed autoprefixer/postcss combination; coordinated visual/build qualification needed |
| #95 | BLOCKED (open) | `1d978992375ffb5b187c966841298131edb305ab` | Proposed React/types 19.3.0 conflicts with tested runtime invariant 19.2.8; coordinated framework qualification needed |
| #116 | BLOCKED (open) | `1138150889ec1237a848073f352881d93b72484b` | Recovery/governance release needs hosted security, recovery and owner/account approvals. Not merged |

Replacement CI: https://github.com/emeaexecutive/Cyber-Sentinels-V2/actions/runs/39408737290

PR links: https://github.com/emeaexecutive/Cyber-Sentinels-V2/pull/117 and the numbered PRs above. No dependency PR was merged merely to reduce the count. No Production deployment or hosted migration was performed by these actions.
