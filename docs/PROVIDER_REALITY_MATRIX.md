# Provider Reality Matrix

Release 0.9.3 — current clean-checkout evidence on 2026-07-12.

The readiness contract is implemented in `lib/providers/provider-readiness.ts`. A provider can be `Live` only when credentials/configuration exist and a successful real health check with timestamp is supplied. Environment-variable presence alone results in Test Mode at most.

No provider is genuinely Live in the current checkout. No local `.env.local` exists, the inspected provider environment keys were absent, and no successful real health-check evidence was recorded.

| Priority provider | Adapter found | Current evidence state | Normalized result | Timeout/audit | Deployment and retention limitation | Next action |
|---|---|---|---|---|---|---|
| World ID | Yes | Awaiting Credentials | Contract present; exchange explicitly not connected | Timeout scaffold; protected audit required | Cloud; provider retention contract not validated | Configure server verification and record real health check |
| Stripe Identity | Yes | Awaiting Credentials | Adapter contract present | Timeout scaffold; audit path required | Cloud; workflow setup and retention review required | Configure identity workflow, not billing-only key presence |
| Veriff | Yes | Awaiting Credentials | Detection adapter normalization present | Timeout handling present; no retry proof | Cloud; data egress review required | Configure sandbox, then reviewed health evidence |
| Entrust / Onfido | Yes | Awaiting Credentials | Placeholder/adapter normalization present | No reviewed production path | Cloud; identity-document retention review required | Choose one provider and validate one workflow |
| Reality Defender | Yes | Awaiting Credentials | Detection adapter normalization present | Timeout handling present; no benchmark evidence | Cloud; raw payloads remain protected | Configure test mode and reviewed cases |
| C2PA verification | Yes | Awaiting Credentials | Provenance adapter present | Timeout handling present | Cloud endpoint; provenance absence is not proof of manipulation | Configure verifier endpoint and test corpus |
| Supabase Auth | Yes | Awaiting Credentials in this checkout | Auth/session normalization implemented | Eight-second browser timeout and audit handling exist | Cloud; authorization and RLS remain separate | Record authenticated health and tenant-isolation checks |
| Cloudflare Turnstile | Yes | Awaiting Credentials | Server verification result supported | Failure handled safely | Hybrid form protection; token data not Trust Memory | Configure site/secret keys and real challenge check |

Other adapters (Sensity, Pindrop, document forensics, SynthID, Persona, Hopae and device risk) remain secondary, disabled, simulated, test-only or awaiting credentials according to their registry evidence. None is promoted to Live by this audit.
