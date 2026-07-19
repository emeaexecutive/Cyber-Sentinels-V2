# Runbooks

Runbooks describe repeatable operational procedures with prerequisites, owners, evidence, failure handling and rollback. They must preserve audit history and distinguish repository checks from credentialed environment checks.

Existing provider and deployment runbooks remain in their current locations until a separately reviewed consolidation moves them.

Current production-alignment runbooks:

- `vercel-production-verification.md` records repository, Vercel and live-domain evidence plus dashboard-only checks.
- `vercel-notification-policy.md` preserves Production alerts while defining the least-noise Preview notification target.
