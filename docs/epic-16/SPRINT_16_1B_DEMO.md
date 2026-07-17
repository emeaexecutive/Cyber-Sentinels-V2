# Sprint 16.1B demo

Use approved mock or Hopae sandbox data and label the evidence mode on every screen.

1. Open `/admin/provider-status`; show Hopae environment, configuration boundary, adapter/API/mapping version, and no secret values.
2. Authenticate into a tenant and create trust through `POST /api/trust/execute`. Show the pre-call provider execution record and server-selected eID.
3. Retrieve the provider session with `GET /api/trust/execute?provider_session_id=...`; show tenant ownership and polling controls.
4. Send a correctly signed documented Hopae callback to `POST /api/providers`; show signature verification and SHA-256 source digest.
5. Send forged, old, future, duplicate, oversized, and wrong-content-type deliveries; show safe rejection or idempotent acknowledgement.
6. Show `normalized_identity_evidence`: `IDENTITY_SESSION` only, mapping version, assurance, source digest, no raw claims/tokens/documents.
7. Follow Replay, Evidence Graph, Trust Memory, receipt, and authoritative Trust Decision references.
8. Show ORI as post-decision recommendation only; provider outage is operational degradation, not user fraud.
9. Show a cross-tenant read denial and an authenticated browser insert denial.
10. Admin-disable Hopae with a reason. Show new session creation blocked, signed callbacks acknowledged without downstream side effects, retained evidence preserved, and other providers unaffected.

Do not call a mocked or sandbox screen production evidence.
