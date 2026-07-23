# EPIC 17.1E Verification Report

Generated: 2026-07-23T09:06:54.494Z
Aggregate exit code: 2

| Check | Status | Critical | Detail |
|---|---|---:|---|
| Artifact: src/components/consent/ConsentBanner.tsx | PASS | yes | Present |
| Artifact: src/components/consent/ConsentPreferences.tsx | PASS | yes | Present |
| Artifact: src/components/consent/ConsentCategory.tsx | PASS | yes | Present |
| Artifact: src/components/consent/ConsentReceipt.tsx | PASS | yes | Present |
| Artifact: src/components/consent/ConsentTimeline.tsx | PASS | yes | Present |
| Artifact: src/components/consent/ConsentProviderList.tsx | PASS | yes | Present |
| Artifact: src/components/consent/ConsentStatus.tsx | PASS | yes | Present |
| Artifact: app/privacy/page.tsx | PASS | yes | Present |
| Artifact: app/privacy/preferences/page.tsx | PASS | yes | Present |
| Artifact: app/privacy/cookies/page.tsx | PASS | yes | Present |
| Artifact: app/privacy/consent-history/page.tsx | PASS | yes | Present |
| Artifact: app/admin/consent/page.tsx | PASS | yes | Present |
| Artifact: app/api/consent/route.ts | PASS | yes | Present |
| Artifact: app/api/consent/withdraw/route.ts | PASS | yes | Present |
| Artifact: app/api/consent/history/route.ts | PASS | yes | Present |
| Artifact: app/api/consent/receipt/[id]/route.ts | PASS | yes | Present |
| Artifact: app/api/consent/policy/route.ts | PASS | yes | Present |
| Artifact: app/api/consent/catalogue/route.ts | PASS | yes | Present |
| Artifact: app/api/admin/consent/summary/route.ts | PASS | yes | Present |
| Artifact: app/api/admin/consent/policies/route.ts | PASS | yes | Present |
| Artifact: src/lib/consent/receipt.ts | PASS | yes | Present |
| Artifact: src/lib/consent/tracker-loader.ts | PASS | yes | Present |
| Artifact: src/lib/consent/google-consent.ts | PASS | yes | Present |
| Artifact: src/lib/consent/integrations.ts | PASS | yes | Present |
| Artifact: supabase/migrations/202607200002_enterprise_trust_consent_manager.sql | PASS | yes | Present |
| Artifact: docs/implementation/EPIC-17.1E-IMPLEMENTATION-REPORT.md | PASS | yes | Present |
| Artifact: docs/architecture/CONSENT-DOMAIN-MODEL.md | PASS | yes | Present |
| Artifact: docs/privacy/CONSENT-POLICY-MODEL.md | PASS | yes | Present |
| Artifact: docs/privacy/COOKIE-AND-TRACKER-CATALOGUE.md | PASS | yes | Present |
| Artifact: docs/privacy/CONSENT-RECEIPTS.md | PASS | yes | Present |
| Artifact: docs/security/CONSENT-SECURITY-CONTROLS.md | PASS | yes | Present |
| Artifact: docs/operations/EPIC-17.1E-RUNBOOK.md | PASS | yes | Present |
| Artifact: docs/implementation/EPIC-17.1E-TEST-REPORT.md | PASS | yes | Present |
| Branch is main | FAIL | yes | Branch: epic-19-enterprise-production-rc1 |
| Merge conflicts | PASS | yes | No conflict markers |
| Secret scan | PASS | yes | No high-confidence secret patterns |
| Equal Accept and Reject controls | PASS | yes | Required invariants present |
| No optional pre-choice default | PASS | yes | Required invariants present |
| Receipt integrity | PASS | yes | Required invariants present |
| Consent RLS and append-only history | PASS | yes | Required invariants present |
| Tracker loader | PASS | yes | Required invariants present |
| Google Consent Mode v2 | PASS | yes | Required invariants present |
| Accessibility contracts | PASS | yes | Required invariants present |
| Hopae and World ID regression | PASS | yes | Required invariants present |
| Lint | PASS | no | Command passed (22712 ms) |
| TypeScript | PASS | no | Command passed (8492 ms) |
| Consent unit/integration/accessibility tests | PASS | no | Command passed (1142 ms) |
| Production build | PASS | no | Command passed (169123 ms) |
| Supabase migration and live RLS | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — verifier does not mutate infrastructure |
| Production region/provider catalogue | BLOCKED | no | BLOCKED_BY_EXTERNAL_CONFIGURATION — requires reviewed deployment configuration |

No deployment, infrastructure mutation, Production data access or secret output was performed.
