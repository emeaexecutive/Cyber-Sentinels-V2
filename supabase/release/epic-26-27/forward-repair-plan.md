# Forward deployment plan

The Epic 16, Epic 17, Enterprise Trust Graph, and Epic 26 migrations were proven absent from Production and every durable Supabase branch before historical source correction. Epic 16 now creates `provider_operational_health_snapshots`; Epic 17 creates the tenant-scoped `provider_health_snapshots`; the Enterprise graph creates `trust_graph_relationships_v2` without altering applied legacy `trust_relationships`; and Epic 26 uses a parse-balanced canonical lease-hash expression without changing its immutable inputs. The original corrected sources remain in Git history, and the manifest binds their original and corrected hashes.

No data migration, table rename in a durable database, or Production migration-ledger repair is required. Do not attempt an out-of-order repair.

Recreate the disposable PR #16 Preview from an empty database, apply the complete repository migration history, and run every validation script in the manifest. The replay must create both provider-health tables, reach Epic 26, Epic 27, and Epic 28, and pass RLS and inventory checks. Production remains untouched until separate deployment authorization is granted after hosted checks pass.
