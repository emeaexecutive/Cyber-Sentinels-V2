# Customer Zero — final Production qualification

Main: b0f6b37d41714efa940852b3ef955e9c7317c513
Deployment: dpl_3yX9aPfmjumxNH2DS56dnzTFL7zc
Agent: agent:82b181d2-5325-4aaf-87d1-82c70884f3c2

1. A separate Node process generated an external Ed25519 pair, registered its public key and signed manifest, and completed native possession proof. Identity became VERIFIED.
2. The owner-issued, bounded authority permitted read_repository on repository:customer-zero-v1-release-evidence for deployment_evidence_review in Production.
3. The process sent a real signed heartbeat. The server atomically recorded signed configuration and heartbeat evidence. Sequential and concurrent replay and invalid bindings were rejected.
4. The first exact action returned ALLOW: eff3b7cf-5dce-5cdc-8292-b4ad572d8ca9. Its receipt, Replay and Memory 4080faf3-3bad-452b-a235-6841e6bd07df persisted.
5. Authority 5775b143-8b35-4652-bdc5-a2e0e5b15b40 was revoked. The same action returned DENY: 819313c8-1e2a-5d85-bdf0-d3d91f86ebab. Identity remained VERIFIED. Receipt, Replay and Memory 2930e58b-b7d5-4a79-b5ac-b1a597a55856 persisted.
6. Controlled later adjudication attached DENY / CONTRADICTED to the original ALLOW, preserving its original decision, digest and reason codes. Memory: b5f6114e-350b-454e-9111-13bf8ca951b8.
7. Cross-tenant access failed closed, all temporary keys were revoked, and final revoked keys returned HTTP 401.

No downstream operation or model invocation was performed. Monitoring attests only the signed control-plane observation, and configuration authenticates the signed declaration.
