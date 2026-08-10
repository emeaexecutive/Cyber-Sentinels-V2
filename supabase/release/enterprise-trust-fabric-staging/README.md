# Enterprise Trust Fabric staging release package

This is the canonical Epic 29.2 review package for reconstructing the isolated staging boundary in Epic 29.3. It references 41 canonical migrations from `202606100001` through `202608100005`; it contains no copied migration SQL and performs no migration automatically.

The required starting ledger head is `202606090003`. Before any future execution, verify the actual staging project outside SQL, set the session-scoped release identity values required by `preflight.sql`, and run the environment safety guard. Production, unknown identities, missing synthetic mode and unexpected ledger heads fail closed.

Apply phases A-F only under separate Epic 29.3 authorization and stop at every phase boundary. Phase G is read-only validation. Live behavioral RLS testing remains reserved for Epic 29.4.

Canonical order and hashes are in `migration-order.txt`, `phase-manifest.json` and `SHA256SUMS`. Validation files inspect catalogs only and must never be used to infer that Production is authorized for mutation.
