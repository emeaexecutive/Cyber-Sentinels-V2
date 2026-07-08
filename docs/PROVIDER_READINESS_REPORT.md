# Provider Readiness Report

Last updated: 2026-07-08

## Program Goal

Prioritize live integrations while maintaining one provider abstraction layer and truthful readiness states. Provider credentials do not imply live inference; endpoint behavior and reviewed evidence must prove integration status.

## Priority Provider Tracks

| Track | Purpose | Readiness criteria |
| --- | --- | --- |
| Identity providers | Entity and account assurance. | Signed response, verified subject, replay entry, credential isolation. |
| Media provenance | Executive impersonation and content authenticity. | C2PA/provenance status, evidence hash, source chain, governance outcome. |
| Deepfake providers | Media and session risk signals. | Provider API response, confidence band, reviewed false-positive handling. |
| ATS | Hiring workflow evidence and receipts. | Signed webhook, prepared action, fail-closed handling, receipt export. |
| SSO | Enterprise access control. | SAML/OIDC mapping, tenant boundaries, admin audit event. |
| C2PA | Content authenticity and chain-of-custody. | Manifest verification, tamper state, evidence attachment, replay link. |

## State Model

| Public state | Meaning |
| --- | --- |
| Live | Provider endpoint is implemented, credentialed, tested, and producing reviewed evidence. |
| Simulated | Demo or fallback behavior is explicit and not represented as live detection. |
| Awaiting Credentials | Adapter exists or is planned, but live credentialed calls are not active. |
| Disabled | Provider is intentionally unavailable or not configured. |

## Abstraction Requirements

- Normalize provider outputs before they reach dashboards or public reports.
- Persist provider state separately from final governance outcome.
- Fail closed when signature, credential, or payload validation fails.
- Avoid provider-specific UI sprawl; surface provider evidence through replay, receipts, and readiness dashboards.
