# Route Inventory

Last audited: 2026-07-08

This inventory scans every `app/` page and route handler. It does not remove capabilities, APIs or admin functionality. `LEGACY` means the route should be hidden, nested, merged or redirected only after usage checks; it does not mean deleted.

## Summary

- ADMIN: 47
- DEVELOPER: 8
- ENTERPRISE: 64
- INTERNAL: 124
- LEGACY: 46
- PUBLIC: 49
- Total routes: 338

## Inventory

| Route | Type | Classification | Purpose | Owner | Visible? | Navigation? | Merge Candidate? | Hide? | Deprecated? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/about/future-of-trust` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/about/mission` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/about` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/about-us` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/accessibility` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/admin/access` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | Yes | Admin operations hub | Yes | No |
| `/admin/agents` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/api-tests` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/benchmarking` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/deployment-readiness` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/detection-status` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/fake-actors/[id]` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/fake-actors` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/founder-control` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/integrations/ats` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/integrations` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/launch-control` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/pilot-overview` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/provider-status` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/readiness-gate` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/reviews` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/runtime-validation` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/support/[id]` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/support` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/test-lab` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/test-results` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/trust-execution` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/trust-integrity` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/admin/verification-testbench` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/agent-passport` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/agent-registry/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/agent-registry` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/agents/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/agents/[id]/runtime` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/agents` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/agents/register` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/ai-governance` | Page | LEGACY | Governance, review or protected operations surface. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/api/access/governance` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/admin/access` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/api-tests/run` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/appeals/[id]/review` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/assistant/draft-answer` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/data-rights/[id]/status` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/evidence/[id]/decision` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors/[id]/block` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors/[id]/escalate` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors/[id]/export` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors/[id]/false-positive` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors/[id]/remove` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors/[id]/report` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/fake-actors` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/feedback/[id]` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/help-questions/[id]/answer` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/messages/[id]/action` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/reviews` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/support/[id]` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/trust-assistant-questions/[id]/answer` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/trust-integrity/repair` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/admin/verification-cases/[id]/decision` | API | ADMIN | Runtime endpoint for the route family. | Operations / Admin | No | No | Admin operations hub | Yes | No |
| `/api/agents/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/agents/activity` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/agents/register` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/agents` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/agents/verify` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/ai-governance/analyze` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/audit/export` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/audit/summary` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/auth/logout` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/auth/replay-event` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/auth/session-action` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/auth/session-expired` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/auth/turnstile` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/authorization/history` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/badges/verify` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/billing/checkout` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/candidate/verify` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/client/summary` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/compliance/export` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/demo/seed` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/detection/status` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/developer/api-keys` | API | DEVELOPER | Runtime endpoint for the route family. | Platform Engineering | Protected/limited | No | No | From public nav | No |
| `/api/embed/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/enterprise-access` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/evidence` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/evidence/upload` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/feed/public` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/governance/events` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/governance/routing` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/health` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/hpg/analyze` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/integrations/ats/receipts/[id]/export` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/integrations/ats/webhook` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/interview/analyze` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/interview/create` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/interview/liveness` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/interview/report` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/ledger/subject/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/ml/benchmark` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/ml/readiness` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/ml/status` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/origin/analyze` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/passports/[id]/decision` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/passports` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/permissions/check` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/policies` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/provenance/report/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/provenance` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/provenance/verify` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/providers` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/public/profile/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/public/verify/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/reality-twin/analyze` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | Trust Engine / Provider evidence | Yes | No |
| `/api/receipts/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/recruiter/verify` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/registry/search` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/replay/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/revocation/check` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/seals/verify/[id]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/session/integrity` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/session/risk` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/status` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/step-up` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/stripe/create-checkout-session` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/stripe/customer-portal` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/stripe/webhook` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/support/issues` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/team/invite` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/team/summary` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/alerts` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/authenticate` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/authorization` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/calculate` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/certifications` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/check` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/decision` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/events` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/evidence` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/execute` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/explain` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/hiring-score` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/passport` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/posture` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust/thresholds` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust-algorithm/run` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust-events` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust-recovery` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/trust-reports` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/verification/signals` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/verifiers` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/verify/world` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/waitlist` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/workflows/[id]/trust` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api/workflows/access-state` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/api-docs` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Protected/limited | No | Developer hub | No | No |
| `/appeals` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/architecture` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/auth/callback` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/autonomy-governance` | Page | LEGACY | Governance, review or protected operations surface. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/back-office` | Page | ADMIN | Governance, review or protected operations surface. | Operations / Admin | No | No | No | Yes | No |
| `/billing` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/careers` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/clearances` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/client-portal` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/command-center` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/compliance-export` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/cookies` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/corporate-sustainability` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/dashboard/access-governance` | Page | ENTERPRISE | Governance, review or protected operations surface. | TrustOps Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/agent-risk` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/governance` | Page | ENTERPRISE | Governance, review or protected operations surface. | TrustOps Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/interview-risk` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/network-risk` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | Yes | Unified dashboard shell | From public nav | No |
| `/dashboard/session-integrity` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/session-security` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/trust-posture` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/dashboard/validation` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | Unified dashboard shell | From public nav | No |
| `/data-rights` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/decision-engine` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/deepfake-detection` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/demo/agent-tracking-flow` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/demo/hiring-attack` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/demo` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/demo/session-integrity` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/demo/trust-execution-flow` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/demo-lab` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/design-partner` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/design-partners` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/developer-console` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Protected/limited | No | Developer hub | No | No |
| `/developers/api-keys` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Protected/limited | Yes | Developer hub | From public nav | No |
| `/developers/authentication` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Yes | Yes | Developer hub | No | No |
| `/developers/docs` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Yes | Yes | Developer hub | No | No |
| `/developers` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Yes | Yes | Developer hub | No | No |
| `/developers/trust-events` | Page | DEVELOPER | Developer and integration-owner surface. | Platform Engineering | Yes | No | Developer hub | No | No |
| `/docs/[slug]` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/embed/[id]` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/enterprise/agent-governance` | Page | PUBLIC | Governance, review or protected operations surface. | Growth / Enterprise GTM | Yes | Yes | Enterprise hub | No | No |
| `/enterprise/auditability` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/buyer-documentation` | Page | PUBLIC | Canonical role-based buyer evaluation and trust-evidence surface. | Growth / Enterprise GTM | Yes | Yes | Enterprise hub | No | No |
| `/enterprise/compliance` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/consortium` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/control-plane` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/demo-stories` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/hiring-security` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | Yes | Enterprise hub | No | No |
| `/enterprise/identity-governance` | Page | PUBLIC | Governance, review or protected operations surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/enterprise/pilot` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | Yes | Enterprise hub | No | No |
| `/enterprise/pilot-checklist` | Page | PUBLIC | Public controlled-pilot scope, timeline, ownership and rollback surface. | Growth / Enterprise GTM | Yes | Yes | Enterprise hub | No | No |
| `/enterprise/pilot-setup` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/readiness` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise/walkthrough` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | No | Enterprise hub | No | No |
| `/enterprise-access` | Page | PUBLIC | Enterprise buyer, pilot or workflow surface. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/evidence-upload` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/evidence-vault` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/execution-passports` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/favicon.png` | API | INTERNAL | Runtime endpoint for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/feedback` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/funding` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/global-trust` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/governance` | Page | PUBLIC | Governance, review or protected operations surface. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/help` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/hiring-shield` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/how-to-use` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/human-presence-genome` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/human-presence-index` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/intent-verification` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/interview/session/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/investor` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/journal` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/knowledge-base` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/launch-console` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/launch-control` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/legal` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/linkedin-verification` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/login` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/marketplace-trust` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/media-centre` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/messages` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/methodology` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/mission-control` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/modern-slavery` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/modern-slavery-statement` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/notifications` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/operational-principles` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/origin-dna` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/origin-trace` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/our-people` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/page.tsx/page.tsx` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/passport` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/passports/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/passports` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/permissions-firewall` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/pilot/getting-started` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/pilot/welcome` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/platform` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/policy-engine` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/pricing` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/privacy` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/profile/[id]` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/profile` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/pro-waitlist` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/qa-console` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/reality-chain` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/reality-os` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/reality-passport` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/reality-twin` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/recruiter/dashboard` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/regulatory` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/replay/[id]` | Page | ENTERPRISE | Replay, evidence, receipt or operational-memory surface. | TrustOps Product | Protected/contextual | No | No | From public nav | No |
| `/reset-password` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/revocation-engine` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/seal/[id]` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/security` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/signals` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/state-verification` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/status` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/status/verification` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | Admin operations hub | Yes | No |
| `/step-up-verification` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/sustainability` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/synthetic-counterpart` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/team-access` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/team-workspace` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/terms` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/timeline` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/transparency` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/trust/agent/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust/analytics` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust/data-sovereignty` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | Yes | No | No | No |
| `/trust/hiring-report/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust/interview-report/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust/media/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/trust/posture` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust/receipt/[id]` | Page | ENTERPRISE | Replay, evidence, receipt or operational-memory surface. | TrustOps Product | Protected/contextual | No | No | From public nav | No |
| `/trust/session/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust/transparency` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust-algorithm` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-assistant` | Page | ENTERPRISE | User-facing surface for the route family. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust-badges` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-center` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | Yes | No | No | No |
| `/trust-embeds` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-evaluation-lab` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-events` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/trust-fabric` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/trust-feed` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-graph` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/trust-graph-engine` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/trust-graph-explorer` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/trust-intelligence` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/trust-ledger` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/trustops` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-os` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-posture` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/trust-prediction` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-principles` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/trust-radar` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-recovery` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-registry` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/trust-replay` | Page | ENTERPRISE | Replay, evidence, receipt or operational-memory surface. | TrustOps Product | Protected/contextual | No | No | No | No |
| `/trust-seal-authority` | Page | INTERNAL | User-facing surface for the route family. | Engineering / Operations | No | No | No | Yes | No |
| `/trust-timeline/[id]` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/trust-timeline` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Replay Engine / Trust Center | Yes | Yes |
| `/verification/receipt/[id]` | Page | ENTERPRISE | Replay, evidence, receipt or operational-memory surface. | TrustOps Product | Protected/contextual | No | No | From public nav | No |
| `/verification-queue` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verification-receipts` | Page | ENTERPRISE | Replay, evidence, receipt or operational-memory surface. | TrustOps Product | Protected/contextual | No | No | From public nav | No |
| `/verification-replay` | Page | ENTERPRISE | Replay, evidence, receipt or operational-memory surface. | TrustOps Product | Protected/contextual | Yes | No | No | No |
| `/verifier-network` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/verify/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verify/candidate` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verify` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verify/provenance` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verify/recruiter` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verify/session` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | No | No |
| `/verify-email` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/video-verification` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Trust Engine / Provider evidence | Yes | Yes |
| `/why-now` | Page | PUBLIC | User-facing surface for the route family. | Growth / Enterprise GTM | Yes | No | No | No | No |
| `/workforce-trust` | Page | LEGACY | Legacy or overlapping concept surface retained for consolidation. | Product Consolidation | No | No | Five-engine platform taxonomy | Yes | Yes |
| `/workspace/[id]` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
| `/workspace` | Page | ENTERPRISE | User-facing surface for the route family. | Enterprise Product | Protected/contextual | No | No | From public nav | No |
