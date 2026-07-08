# Epic 02 Security Scorecard

Last updated: 2026-07-08

| Area | Score | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Authentication | CAUTION | Supabase auth, email verification and login flows are present. | Production auth-email and redirect configuration need live verification. |
| Authorization | READY | Middleware and admin allowlist protect admin/internal routes. | Continue checking route inventory before exposing new pages. |
| RLS | CAUTION | RLS is documented and partially hardened. | Older broad authenticated policies still require owner/admin tightening before unrestricted production. |
| Session Security | CAUTION | Session integrity and session-security dashboards exist. | MFA, device and geo provider evidence require live configuration. |
| Secrets | READY | Provider/admin docs avoid exposing raw credential values. | Continue server-only env handling during provider rollout. |
| Provider Keys | CAUTION | Provider readiness distinguishes credentials from production inference. | Endpoint validation and audit logging must precede Connected status. |
| Audit Logging | READY | Replay, receipts, governance and audit exports exist. | Avoid storing raw provider payloads or secrets. |
| Rate Limiting | CAUTION | Abuse-prone routes are identified. | Public intake/auth/provider endpoints need production rate-limit verification. |
| Step-Up Authentication | CAUTION | Back-office/admin verification cookie protects admin workflows. | MFA and enterprise SSO should be formal production gates. |

## Security Position

Design-partner ready for controlled pilots if admin access remains protected, provider states remain truthful and older RLS tightening is tracked as production work.
