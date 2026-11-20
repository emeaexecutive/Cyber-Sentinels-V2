# PR138 secret-scan correction

12 November 2026. Reviewed failing PR head `8d31e027921ad046afd9158daaaadba2d9b41c64`, GitHub run `43208182464`, job `131148606301`. Its full-history scanner found 21 records from other published SOC commits fetched by the checkout, not 21 private keys in the schema migration.

Reproduced with Gitleaks **8.28.0**, existing `gitleaks.toml`, redacted JSON, and `--log-opts=--remotes=origin`: **894 published commits, 36.36MB, 21 findings**. This explicitly excludes local unpublished archive branches, which are not in GitHub CI's checkout. The scanner configuration and detection rules are unchanged.

Each exact historical fingerprint was compared with the reviewed runtime-branch list and its original committed JSON. Eighteen values are SHA256 fingerprints of enrolled **public** runtime keys; three are synthetic UUID idempotency keys, including the synthetic destination record. The enrollment code hashes normalized public-key material; the demo generates UUIDs. No private key, bearer credential or provider secret is represented by these values. No credential rotation is required.

The correction adds only those 21 exact commit/path/rule/line fingerprints to the existing verified-fixture list. It adds no rule/path exclusion. The metadata-only triage file records every fingerprint and classification without matched values.

Post-correction reproduction on the same published-origin history: **exit0, 894 commits, 36.36MB, zero findings**. Command: `gitleaks git . --config gitleaks.toml --gitleaks-ignore-path gitleaks-verified-fixtures.ignore --redact --no-banner --log-opts=--remotes=origin`. A fresh GitHub run on the correction commit remains required; a local clean scan is not that CI result. No schema, application runtime, hosted database or deployment was changed.
