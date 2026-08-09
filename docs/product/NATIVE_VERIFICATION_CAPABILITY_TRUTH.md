# Native Verification Capability Truth

## Working in repository

Cyber Sentinels now has an executable, provider-free native identity-evidence path for non-human Operational Entities:

- real Ed25519 key generation/signing is exercised by tests and the non-Production browser simulator;
- public JWK registration rejects private key material and unsupported algorithms;
- signed, versioned manifests bind entity, tenant, owner, software/model/runtime declarations, capabilities, authority reference, and credential;
- cryptographically random challenges are tenant-, entity-, audience-, key-, manifest-, nonce-, and time-bound;
- atomic single-use consumption prevents duplicate or concurrent proof reuse;
- successful proof creates `NATIVE_ENTITY_IDENTITY_PROOF` with `CYBER_SENTINELS_NATIVE` provenance;
- native evidence enters the existing Evidence Graph and canonical `ALLOW / REVIEW / DENY` path;
- external identity providers are optional and remain available as separately attributed corroboration;
- rotation, credential/manifest/owner revocation, continuity, Replay, Trust Memory, and Continuous Trust reevaluation are implemented;
- the Operational Entity and authenticated CPTO demo surfaces expose persisted proof and unknowns.

The provider-free test proves that native identity evidence, accountable ownership, and valid authority can reach the existing canonical runtime with no Hopae, XLC, or external identity-provider evidence.

## What the result means

`VERIFIED` means the submitted proof established possession of the registered private key, matched the signed manifest, passed the challenge bindings, and had no unresolved owner/runtime/build condition in the evaluated inputs.

It does not mean the entity is safe, benign, authorized for every action, independently corroborated, immune to key compromise, or guaranteed to be the originally intended software. Canonical authority, consequence, policy, incidents, evidence independence, and runtime continuity still control execution.

## Qualification boundary

Repository implementation and behavioral/attack tests qualify the capability as `WORKING` in `config/product-capabilities.json`. It is not `STAGING_PROVEN` or `LIVE_PROVIDER_PROVEN`.

A new Supabase migration is included. Clean Preview reconstruction, RLS verification, API execution against the deployed schema, and the authenticated Agent Alpha scenario must pass before public wording is published. Production remains untouched.

Permitted future wording after Preview qualification:

> Cyber Sentinels can establish cryptographically verifiable identity evidence for operational entities without requiring a third-party identity provider.

> External verification providers remain optional evidence sources and can be used for additional corroboration.

Prohibited wording includes “unhackable,” “guaranteed identity,” “fraud proof,” and “independently verified by Cyber Sentinels.”

## Deliberately not in Phase 1

Passport OCR, document authenticity models, facial biometrics, voice biometrics, deepfake ML, and generic human KYC are not implemented by this phase.
