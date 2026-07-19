# EPIC 17.1C Implementation Report

## Outcome

EPIC 17.1C implements an authenticated, tenant-scoped enterprise Identity Signals experience backed by the EPIC 17.1B persistence and provider APIs. The UI does not seed sample records, calculate promotional success metrics, or infer verification from provider registration.

## Implemented surfaces

- `/dashboard/identity` fetches a paginated tenant snapshot from `GET /api/identity/verifications` and displays subjects, request status, provisional confidence, persisted evidence counts, strict verified evidence counts, warnings, provider errors, reason codes and timestamps.
- `/dashboard/identity/verifications/:id` fetches the protected detail contract and presents each evidence record independently, including provider, signal status, server/signature truth, retained references, timestamps, expiry, reason codes and provenance.
- `/dashboard/identity/providers` combines the capability and safe health APIs. Registration, configuration, availability, transaction, signature and server verification remain distinct states.
- `/dashboard/identity/operations` consumes the protected operations contract and separates runtime, repository, external-configuration and not-configured states.

## Truth safeguards

- Strict verified evidence requires `PASS`, `VERIFIED`, server verification, signature verification, a provider reference, a persisted transaction reference and a source digest.
- Hopae shows signed/server-verified evidence only when all strict prerequisites exist in persisted runtime records.
- World ID displays `Proof received — server verification pending` in evidence detail and `Server verification not implemented` in capability views.
- Placeholder providers cannot report transactional, signed or server-verified capability.
- The operations endpoint never accepts caller-supplied evidence and keeps Vercel, Cloudflare and Supabase Production controls blocked.
- Provider health responses contain normalized state, timing, reason codes and blockers; secrets and raw errors are excluded.

## Security and accessibility

All APIs call `resolveIdentityEnterprise`, and all dashboard pages redirect unauthenticated users to login. Tenant ownership or membership is resolved before service-role repository access. Tables have captions and scoped headings, horizontal overflow is keyboard focusable, page controls meet the minimum target size, and loading, empty, blocked, failed and unauthorized states include text labels rather than relying on color.

## Evidence boundary

The implementation is repository-verified and builds successfully. Production data, deployed migrations, Production RLS, live Hopae credentials and external control-plane configuration require verification in their authoritative environments.
