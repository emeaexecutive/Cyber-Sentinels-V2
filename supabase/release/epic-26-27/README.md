# Enterprise Trust Fabric Staging Architecture Package

This is a review and validation package, not a deployment tool. It contains no secrets and performs no remote operation.

It inventories the corrected Epic 16 provider abstraction, Epic 17 Provider Consensus, corrected Enterprise Trust Graph, corrected Epic 26, Epic 27, and Epic 28 migrations for isolated staging architecture review; it does not apply them. The Epic 16 migration was corrected before first durable deployment to name its global operational table `provider_operational_health_snapshots`; Epic 17 retains the tenant-scoped `provider_health_snapshots` table. The unapplied Enterprise graph migration now uses `trust_graph_relationships_v2` while the applied legacy `trust_relationships` contract remains intact. The unapplied Epic 26 migration retains its canonical lease digest inputs and fixes only the SQL parenthesis defect in statement 32.

Apply the complete repository history in lexical order in an isolated environment. `migration-order.txt` records the reviewed dependency path. Then run `preflight.sql`, `post-apply-validation.sql`, `rls-validation.sql`, and `integrity-validation.sql`; each script is read-only and fails closed with a descriptive exception.

The authoritative SQL remains in `supabase/migrations`; this directory intentionally contains references and hashes rather than copies. `manifest.json` and `expected-inventory.json` inventory tables, views, RPC signatures, indexes, grants, policies, graph edges, Replay objects, Trust Memory dependencies, hashes, checks, limitations, and the canonical fixture.

See `rollback-limitations.md` for the destructive-rollback boundary and `forward-repair-plan.md` for the clean Preview and later Production-authorization boundary.
