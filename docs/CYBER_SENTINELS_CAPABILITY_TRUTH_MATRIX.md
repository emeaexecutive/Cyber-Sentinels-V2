# Cyber Sentinels capability truth matrix

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
