# Forward deployment plan

The Epic 16 and Epic 17 migrations were proven absent from Production and every durable Supabase branch before the historical source correction. Epic 16 now creates `provider_operational_health_snapshots`; Epic 17 creates the tenant-scoped `provider_health_snapshots`. The original Epic 16 source remains in Git history, and the manifest binds both original and corrected hashes.

No data migration, table rename in a durable database, or Production migration-ledger repair is required. Do not attempt an out-of-order repair.

Recreate the disposable PR #16 Preview from an empty database, apply the complete repository migration history, and run every validation script in the manifest. The replay must create both provider-health tables, reach Epic 26, Epic 27, and Epic 28, and pass RLS and inventory checks. Production remains untouched until separate deployment authorization is granted after hosted checks pass.
