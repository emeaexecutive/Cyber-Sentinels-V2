# Epic 26/29 Production Release Manifest

- Source SHA: current branch head from local staging work
- Production starting migration head: not executed; placeholder only
- Target migration head: staging migration head captured in existing release evidence
- Exact migration hashes: captured in release package evidence
- Ordered release phases: preflight, migration, application rollout, evidence publication
- Owners and approvers: release owner, database owner, security owner
- Backup checkpoint: not executed; metadata only
- Maintenance window: not executed; placeholder only
- Staging evidence: present in release evidence bundle
- Preflight commands: npm run test:environment-safety, npm run test:staging-release, npm run test:staging-reconstruction, npm run test:live-rls, npm run test:live-governance
- Migration commands: not executed in this workspace
- Application deployment order: schema first, then app rollout, then validation
- Validation commands: npm run test:release-health, npm run test:staging-application, npm run test:release-qualification
- Release-health checks: protected internal health endpoint
- API/UI smoke tests: documented in staging validation summary
- Cloudflare/domain checks: staging-only, no Production settings touched
- Rollback: documented in rollback runbook
- Forward repair: documented in rollback runbook
- Release-stop rules: documented in release stop and escalation guide
- Evidence locations: docs/release and supabase/release/enterprise-trust-fabric-staging/evidence
- Final authorization phrase: APPROVE EPIC 29 PRODUCTION RELEASE

This manifest is documentation only and does not authorize any Production deployment or migration.
