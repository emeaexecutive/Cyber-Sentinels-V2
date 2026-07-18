# Database documentation

This directory owns persistence architecture, schema conventions, migration procedures, Row Level Security expectations, retention rules and recovery guidance.

Executable schema history remains under `supabase/migrations/`. Documentation never replaces a migration and must not imply that a migration is applied merely because its source file exists.

The current migration-source inventory is `database-overview.md`; table-level keys, relationships, RLS evidence and representative consumers are in `schema-map.md`.
