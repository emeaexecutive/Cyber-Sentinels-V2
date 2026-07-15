# Provider maturity — Release 1

## Readiness contract

Every adapter is classified as `Production Ready`, `Configured`, `Awaiting Credentials`, `Prototype`, or `Deprecated`. `Production Ready` requires a successful real health check plus normalized results, timeout handling, audit logging, and an enabled production path. Credential presence alone resolves only to `Configured`.

The current state is computed at runtime by `buildProviderReadinessChecklist()`. This source review supplied no real health-check evidence, so it does not declare any adapter Production Ready.

## Adapter audit

| Adapter | Registry | Normalized response | Health evidence in this review | Primary release blocker |
| --- | --- | --- | --- | --- |
| Reality Defender | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| Sensity | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| Pindrop | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| Document Forensics | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| Onfido / Entrust | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| Veriff | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| World ID | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| Stripe Identity | Detection | Yes | None supplied | Credentials, real endpoint health, reviewed benchmark |
| C2PA | Detection | Yes | None supplied | Real verification evidence and reviewed benchmark |
| SynthID | Detection | Yes | None supplied | Real verification evidence and reviewed benchmark |
| External verification source | Verification | No | None supplied | Unattributed placeholder must remain disabled |
| World ID | Verification | No | None supplied | Workflow-specific exchange and normalized Replay evidence |
| Stripe Identity | Verification | No | None supplied | Workflow setup and normalized Replay evidence |
| Persona | Verification | No | None supplied | Prototype adapter and restricted-data review |
| Entrust | Verification | No | None supplied | Prototype adapter and restricted-data review |
| Onfido | Verification | No | None supplied | Prototype adapter and restricted-data review |
| Hopae Connect | Verification | Yes | None supplied | Credentials, explicit enablement, real health, pilot review |
| Cloudflare Turnstile | Verification | No | None supplied | Form-level health evidence; it is not a Trust Decision provider |
| Fingerprint / device risk | Verification | No | None supplied | Prototype adapter, data egress, and normalized Replay evidence |
| Supabase Auth | Platform | Yes | None supplied | Authenticated real health and tenant-isolation validation |

## Summary

- 20 readiness records audited: 10 detection adapters, 9 verification definitions, and Supabase Auth.
- 12 records advertise canonical normalized evidence/result handling in source.
- 8 verification definitions remain intentionally unconnected to normalized Replay evidence.
- Retry support is not claimed by the checklist; timeout behavior is explicit.
- Health summaries expose Healthy, Degraded, Blocked, or Unknown with timestamp, latency when measured, and the process-local limitation.
- No adapter in this review is marked Deprecated.

Next milestone: take one workflow-specific provider from Configured or Awaiting Credentials to Production Ready using a real health result, restricted-data review, normalized Replay evidence, audit metadata, and reviewed validation cases.
