# Multimodal Evidence Extensibility

Status: typed architecture boundary only. No harmful-meme detector or generic content-moderation product is implemented.

Cyber Sentinels treats detector output as evidence. A detector label or score is neither truth nor authorization. The canonical lifecycle remains:

`SUBJECT -> MULTIMODAL ARTIFACT -> PROVENANCE -> DETECTOR EVIDENCE -> POLICY -> DECISION -> CONSEQUENCE -> EVIDENCE GRAPH -> REPLAY -> TRUST MEMORY -> OUTCOME`

The typed contract lives in `src/lib/multimodal-evidence/types.ts`. It references the existing Trust Fabric subject and evidence-reference vocabulary instead of creating a second trust engine, decision path, Evidence Graph, Replay store, or Trust Memory.

## Artifact and provenance boundary

An Operational Entity may eventually submit or reference an image, text, image-and-text composition, video, audio, document, or generated/synthetic-media artifact. The contract records the submitting identity, tenant, digest, media type, storage reference, submission time, modalities, and provenance references. Raw media is not placed in the evidence contract.

Provenance remains distinct from detector output. Capture, generation, or transformation claims have their own source identities and attestation references.

## Detector evidence boundary

Every detector observation retains:

- provider, detector, model identifier, and model version;
- the exact analysis scope and input modalities;
- the provider result label, optional score and declared scale;
- confidence, reason codes, observation time, payload digest, and derivation references.

No field promotes the record into a trust decision. A future policy may consume the evidence, but only the canonical decision runtime may authorize a consequence.

## Disagreement is first-class

A harmful-meme case may produce:

- image detector: `SAFE`;
- text detector: `SAFE`;
- joint image-and-text detector: `HARMFUL`.

All three records must remain independently referenceable. `DetectorAgreementRecord` expresses consensus, disagreement, or insufficient evidence while retaining every contributing reference and explicitly naming conflicting references. Provider-neutral aggregation must not overwrite model provenance or flatten the observations into one opaque score.

The Evidence Graph can therefore represent artifact-to-image evidence, artifact-to-text evidence, artifact-to-joint evidence, conflicts among those records, policy interpretation, decision, consequence, Replay, Trust Memory, and independently observed outcome.

## Product truth

`MULTIMODAL_EVIDENCE_ARCHITECTURE = READY` means only that this typed, provider-neutral lineage boundary exists and protects disagreement/provenance. It does not mean ingestion, storage, detectors, policy execution, or UI are implemented.

`HARMFUL_MEME_DETECTION = NOT_IMPLEMENTED` until a real detector pipeline and independent target-environment tests exist.
