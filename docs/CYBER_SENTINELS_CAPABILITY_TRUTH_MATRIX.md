# Cyber Sentinels capability truth matrix

This matrix reflects repository-backed static validation and staged-safe implementation. Live staging proof is not claimed in this workspace because the required staging Supabase/provider credentials were not present; the table should therefore be read as implemented and static-validated rather than live-validated.

| Capability | Code | Database | API | UI | Contract tests | Live staging proof | Production proof | Current classification | Next proof required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Web application foundation | Present in Next.js app router structure | Present via Supabase-backed application services | Present | Present | Present | Partial | Not proven | production-capable foundation | Staging deployment and route validation |
| Supabase/PostgreSQL | Present | Present | Present | Partial | Present | Partial | Not proven | production-capable foundation | Live RLS and migration reconstruction proof |
| Authentication | Present | Present | Present | Present | Present | Partial | Not proven | working prototype | Staging sign-in and session evidence |
| Tenant isolation | Present in multi-tenant patterns and access controls | Present | Present | Partial | Present | Partial | Not proven | rules-based implementation | Live tenant isolation proof in staging |
| Enterprise Trust Graph | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Staged graph traversal and replay evidence |
| Evidence Graph | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | End-to-end evidence lineage proof |
| Authority Lineage | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Design-partner authority proof |
| Trust DNA | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Evidence-backed trust-state change |
| Replay | Present | Present | Present | Present | Present | Partial | Not proven | working prototype | Deterministic replay proof |
| Continuous Trust | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Live transition and evidence proof |
| Trust Intelligence | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Staged decision evidence |
| Enterprise Trust Learning | Deterministic pattern engine, grounding boundary, simulation and resilience implemented | Development-only derived projection/RLS migration created; not applied | Authenticated tenant-bound routes implemented | Trust Centre view and synthetic demonstrator implemented | Focused non-live contract tests present | Not proven | Not proven | working prototype; AI adapter not configured; proprietary model not trained; cross-customer learning disabled | Apply migration and validate one controlled tenant corpus in staging |
| Operational Trust Intelligence public positioning | Present in public pages and docs | Not applicable | Not applicable | Present | Present | Not applicable | Not proven | public positioning only | Keep wording evidence-backed and no-blueprint |
| Consensus Engine | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | One provider decision path |
| Decision Intelligence | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Allow/review/deny decision evidence |
| Operational Risk Intelligence | Present | Present | Present | Partial | Present | Partial | Not proven | rules-based implementation | Staged recommendation and review evidence |
| Provider Health | Present | Present | Present | Partial | Present | Partial | Not proven | partially integrated | Live provider health evidence |
| Scope Continuity | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Environment and scope attestation proof |
| Environment Attestation | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Staging attestation and policy evidence |
| Serious-Incident Lineage | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Reviewable incident evidence |
| Trust Centre | Present | Present | Present | Present | Present | Partial | Not proven | working prototype | Staged review and export evidence |
| Hopae | Present as provider adapter and tests | Partial | Present | Partial | Present | Partial | Not proven | partially integrated | One live staging proof path |
| World ID | Present as optional integration | Partial | Present | Partial | Present | Not proven | Not proven | UI/presentation layer | Explicit provider flow or removal |
| Stripe | Present | Partial | Present | Partial | Present | Not proven | Not proven | partially integrated | Billing flow proof if public pricing is used |
| Turnstile | Present | Not applicable | Present | Present | Partial | Partial | Not proven | UI/presentation layer | Hosted validation proof |
| AI-agent runtime integration | Present in docs and routes | Partial | Present | Partial | Present | Controlled relay and contract-tested engine only | Not proven | partially integrated | One design-partner transaction with staged evidence and fail-closed provider handling |
| Workload identity | Partial | Partial | Partial | Partial | Partial | Not proven | Not proven | partially integrated | One bounded runtime integration |
| Policy engine | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Decision contract proof |
| Event ingestion | Present | Present | Present | Partial | Present | Partial | Not proven | working prototype | Tenanted ingestion and replay proof |
| Cryptographic evidence | Partial / conceptual | Partial | Partial | Partial | Partial | Not proven | Not proven | not implemented at required level | Explicit append-only proof path |
| Enterprise connectors | Partial | Partial | Present | Partial | Partial | Not proven | Not proven | partially integrated | One live connector |
| Behavioural detection | Partial / experimental | Partial | Partial | Partial | Partial | Not proven | Not proven | simulation/test fixture | Validated behavioural model before claim |
| Content provenance | Not implemented in this task | Not implemented | Not implemented | Not implemented | Not implemented | Not proven | Not proven | not implemented at required level | Defer until approved future extension |
| Compliance operations | Partial | Partial | Partial | Partial | Partial | Partial | Not proven | partially integrated | Design-partner evidence export |

## Public positioning claim register

This register governs the public teaser layer. It does not change the implementation classification of any product capability above.

| Public claim or vocabulary | Truth classification | Evidence in this repository | Approved public wording boundary |
| --- | --- | --- | --- |
| “Cyber Sentinels is building the Operational Trust Intelligence™ platform for intelligent enterprises.” | Category positioning; not a deployment claim | Homepage, investor page and public positioning documents | Use “building”; do not imply production deployment or enterprise-scale proof. |
| “It transforms fragmented identity, security, AI and operational evidence into continuously explainable, evidence-backed trust decisions.” | Intended enterprise outcome supported by working-prototype capabilities | Trust Intelligence, Replay, Authority Lineage and related rows above | Keep outcome-level; do not describe internal processing or claim continuous live monitoring. |
| Operational evidence showing what changed, why trust changed, who was accountable and what happened next | High-level differentiation supported by working-prototype evidence and replay surfaces | Replay, Trust Intelligence, Authority Lineage and Trust Centre rows above | Describe the evidence outcome only; do not claim perfect attribution or expose workflow logic. |
| Operational Trust Intelligence™ and the fourteen supporting names in the brand vocabulary | Public capability vocabulary only | `docs/brand/OPERATIONAL_TRUST_CAPABILITY_NAMES.md` | A name is not implementation proof. Do not describe calculations, relationships, thresholds or status beyond the applicable matrix row. |
| Customer-controlled evidence, accountability and historical proof | Design objective supported in part by repository implementation | Evidence Graph, Replay, Trust Memory-related implementation and tenant-isolation rows above | Use high-level value language; do not claim cryptographic immutability, guaranteed retention or live scale. |
| Design-partner and enterprise-pilot invitation | Design-partner-stage positioning | Design-partner documentation and controlled pilot materials | Invite conversations; do not claim customer traction or a completed production pilot. |
| Early-investor conversation invitation | Conversation availability only | Public investor page and positioning document | Do not publish financial terms, projected returns, valuation or invented traction. |
| Public accountability questions | Category education; not a mechanism claim | Homepage and investor page | Ask what changed, why, who was accountable and what happened next without explaining how answers are produced. |
