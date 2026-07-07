# Validation dataset rules

This directory is a metadata-first scaffold. It intentionally contains no production or customer samples.

- No customer PII or secrets.
- Consented test data only.
- Public/open benchmark data only, with license and source recorded.
- Synthetic samples must be labelled clearly.
- Regulated or restricted data is prohibited unless separately approved.
- JSON cases must follow `lib/validation/validation-case.ts`; binary samples remain outside Git unless explicitly approved.

## Required case metadata

Every labelled JSON case should include:

- `id`
- `label`
- `expectedOutcome`
- `description`
- `signals`
- `dataClassification`
- `datasetMetadata.label`
- `datasetMetadata.source`
- `datasetMetadata.reviewer`
- `datasetMetadata.confidence`
- `datasetMetadata.providerAgreement`
- `datasetMetadata.governanceOutcome`

Allowed `datasetMetadata.source` values are:

- `synthetic`
- `consented_test`
- `public_benchmark`
- `internal_fixture`

Allowed `providerAgreement` values are:

- `agreed`
- `disagreed`
- `not_compared`
- `awaiting_credentials`

This folder is for validation metadata and approved fixtures only. It must not contain customer sessions, raw identity documents, real voice samples, secrets, tokens, unredacted provider payloads, or production screenshots.

## Dataset buckets

The scaffold supports these validation buckets:

- real human sessions;
- synthetic/deepfake sessions;
- virtual camera sessions;
- forged document samples;
- synthetic voice samples;
- injected session samples;
- runtime anomaly events;
- suspicious agent actions;
- clean agent actions; and
- governance-reviewed outcomes.

See `dataset-metadata.schema.json` for the metadata contract used by future labelled cases.

## Dataset registry

The canonical readiness registry is `lib/validation/dataset-registry.ts`. It tracks:

- dataset name;
- category;
- source;
- label quality;
- reviewer status;
- consent status;
- synthetic/public/internal origin;
- `usableForBenchmark`;
- provider coverage; and
- risk diversity.

Registry entries are not benchmark evidence by themselves. A dataset becomes benchmark-usable only when approved JSON cases include source/license or consent metadata, reviewer attribution, label confidence, provider comparison status and governance outcome.
