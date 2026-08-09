# Native Agent Verification Demo Runbook

## Preconditions

- Use Preview or local development only; never run this qualification in Production.
- Apply `202608080003_native_operational_entity_verification.sql` through a clean Supabase Preview reconstruction.
- Authenticate as a workspace owner or administrator.
- Use an existing canonical Operational Entity with an accountable owner and Authority Lineage.
- Send the tenant UUID in `X-Enterprise-Id` for every API request.

The contract is `POST /api/operational-entities/{entityId}/native-verification`. `GET` on the same resource retrieves the tenant-scoped manifest, credential, verification, evidence, owner-binding, and Replay history.

## Agent Alpha flow

1. Open `/operational-entities/{entityId}#native-verification` in Preview.
2. Select **VERIFY ENTITY**. The browser simulator generates an Ed25519 pair with a non-exportable private key, sends only the public JWK, retains the private key in page memory, and discards it when the page closes.
3. The simulator calls `register_credential` with the public JWK and accountable authorization reference.
4. It creates and signs a versioned manifest and calls `register_manifest`.
5. It calls `issue_challenge`; the server derives the Preview-origin audience and returns it in the challenge.
6. It signs the exact returned challenge locally and calls `submit_proof` with an enterprise-asserted browser runtime observation. The simulator does not invent build, source, artifact, image, or deployment provenance.
7. Confirm that the result cites `NATIVE_ENTITY_IDENTITY_PROOF`, `CYBER_SENTINELS_NATIVE`, Ed25519, `native-entity-verification-v1`, exact reason codes, a continuity fingerprint, `RUNTIME_MATCH`, and `NOT_AVAILABLE` software provenance.
8. Run a low-consequence canonical action with valid Authority Lineage. Confirm `ALLOW` is produced by the existing canonical runtime, not the native verifier.
9. Confirm Replay includes credential, owner, manifest, challenge, identity, and runtime events, and Trust Memory contains the initial native verification exactly once. A `BUILD_VERIFIED` event must not exist unless real matching digest evidence was submitted.

## Attack and drift checks

On the first **VERIFY ENTITY** run, the browser demonstration automatically performs challenge replay, copied-ID/wrong-key, manifest-digest tampering, and runtime-drift attempts after the successful proof. The test suite covers the full destructive matrix without exposing or copying a real enterprise private key.

- Copy the entity ID but sign with a different key: expect `INVALID_SIGNATURE` and no evidence.
- Change tenant, entity, audience, nonce, manifest digest, or key ID: expect the corresponding fail-closed reason.
- Reuse or concurrently submit the challenge: exactly one request may succeed; others return `CHALLENGE_REPLAY`.
- Submit after expiry: expect `EXPIRED_CHALLENGE`.
- Modify the signed manifest: expect `MANIFEST_TAMPERED`.
- Change runtime/build observations: expect a continuity change and `REVIEW_REQUIRED` where conflicting.
- Revoke authority and attempt the action: expect canonical `DENY`; native identity must remain unable to bypass authority.

## Rotation and recovery

1. Select **ROTATE KEY AND REVERIFY ENTITY** after an active credential exists.
2. Confirm the new credential is registered `PENDING` with the current credential as its rotation source.
3. Confirm a new signed manifest and challenge are verified with the new key.
4. Confirm the transaction activates the new credential and retires the old credential.
5. Confirm Replay contains `CREDENTIAL_ROTATED` and `REVERIFICATION_COMPLETED`; Trust Memory contains `SIGNING_KEY_ROTATED` once.
6. Re-authorize and request a low-consequence action. `ALLOW` may return only when the canonical owner, authority, evidence, runtime, policy, incident, and consequence conditions pass.

## CPTO proof

Open `/demo/trust-runtime?entityId={entityId}` and answer:

- **How do you know that is the same agent?** Show the canonical entity ID, public-key fingerprint, signed challenge reference, manifest digest, continuity fingerprint, runtime binding, accountable owner, Authority Lineage, and evidence references.
- **What if someone copies the ID?** Demonstrate that the copied reference cannot produce the Ed25519 signature required for the bound single-use challenge.

## HTTP actions

The Phase 1 action vocabulary is: `register_credential`, `rotate_credential`, `register_manifest`, `issue_challenge`, `submit_proof`, `revoke_credential`, `revoke_manifest`, and `revoke_owner_binding`. Requests are authenticated, tenant-isolated, rate-limited, size-bounded, audited, and never accept or return private credentials.
