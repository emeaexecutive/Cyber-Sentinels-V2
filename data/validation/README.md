# Validation dataset rules

This directory is a metadata-first scaffold. It intentionally contains no production or customer samples.

- No customer PII or secrets.
- Consented test data only.
- Public/open benchmark data only, with license and source recorded.
- Synthetic samples must be labelled clearly.
- Regulated or restricted data is prohibited unless separately approved.
- JSON cases must follow `lib/validation/validation-case.ts`; binary samples remain outside Git unless explicitly approved.
