# Cyber Sentinels documentation

## Purpose

This directory is the durable engineering and product record for Cyber Sentinels. Documentation must describe implemented behavior truthfully, separate current state from proposed state, and retain enough evidence for review, deployment and rollback.

## Ownership

| Area | Primary owner | Required reviewers |
| --- | --- | --- |
| Engineering standards and repository foundation | Engineering | Security and affected domain owners |
| Architecture and ADRs | Architecture owner | Engineering, security and affected domain owners |
| API contracts | API owner | Security and client owners |
| Database and migrations | Data owner | Security and application owners |
| Security | Security owner | Engineering and operations |
| Runbooks and releases | Operations / release owner | Engineering and security |
| Testing | Quality owner | Engineering and accessibility reviewer where applicable |
| Product | Product owner | Engineering and design |

Ownership is a review responsibility, not permission to bypass pull-request or evidence requirements.

## Versioning

- Documentation is versioned in Git with the implementation it describes.
- ADRs are immutable decision records: supersede an accepted ADR with a new ADR instead of rewriting its decision history.
- Release documents identify the commit, environment and evidence date where those facts matter.
- Material behavior changes update the relevant architecture, API, security, testing and rollback documents in the same pull request.
- Proposed behavior must be labelled `Proposed`, `Planned` or `Future work`; it must not be described as live.

## Review process

1. The author identifies every documentation area affected by the change.
2. Domain owners verify technical accuracy and evidence boundaries.
3. Security reviews changes involving authentication, authorization, secrets, providers, external calls or persistence.
4. Accessibility reviews user-facing interaction changes.
5. Reviewers confirm that current state, limitations, validation and rollback are explicit.
6. The pull request records approvals before merge to a protected branch.

## Document hierarchy

| Path | Purpose |
| --- | --- |
| `docs/engineering/` | Repository inventory, platform configuration and engineering standards |
| `docs/architecture/` | Current system structure, dependency direction and component boundaries |
| `docs/api/` | Public and internal API conventions and contracts |
| `docs/database/` | Schema, migration, RLS and persistence documentation |
| `docs/security/` | Security model, deployed evidence and security test guidance |
| `docs/adr/` | Architecture Decision Records |
| `docs/runbooks/` | Operational, incident, deployment and recovery procedures |
| `docs/releases/` | Release-specific scope, evidence and acceptance records |
| `docs/testing/` | Test strategy, quality gates and manual test guidance |
| `docs/product/` | Product requirements, ownership and approved product decisions |

## Current architecture baseline

- Application, components, hooks, services, providers and configuration: `docs/architecture/`
- Permanent trust-pipeline contracts and current-versus-target boundaries: `docs/architecture/provider-abstraction.md` through `docs/architecture/trust-decision-engine.md`
- Authentication and admin access: `docs/security/authentication-flow.md`
- Trust-pipeline security control matrix: `docs/security/trust-architecture-requirements.md`
- Supabase object inventory and table map: `docs/database/database-overview.md` and `docs/database/schema-map.md`
- Immutable evidence persistence target and current storage boundaries: `docs/database/evidence-storage.md`
- Endpoint inventory and API standards: `docs/api/api-overview.md` and `docs/api/api-standards.md`
- Prioritized debt and implementation findings: `docs/engineering/technical-debt.md` and `docs/engineering/platform-findings.md`
- Trust architecture findings and migration priorities: `docs/engineering/trust-architecture-review.md`
- Enterprise Trust Report contract: `docs/product/trust-report.md`
- Enterprise Experience site map, buyer, pilot, operations, governance, reporting and quality contracts: `docs/product/enterprise-site-map.md` through `docs/product/content-guidelines.md`
- Enterprise Experience findings and priorities: `docs/engineering/enterprise-review.md`

Existing historical and Epic-specific documents remain valid evidence. New foundation documents do not delete or silently replace them.
