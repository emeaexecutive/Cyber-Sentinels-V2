# Grounded Trust Narrative

Pipeline: canonical query → tenant-safe retrieval → evidence redaction → source bundle → model adapter → citation validation → unsupported-claim detection → reviewer state → safe output.

Every material sentence must cite a reference in the exact retrieved bundle. Material statements without citations, or with unknown citations, are rejected. Contradictory sources remain visible. An empty bundle explicitly reports missing evidence. Exact source versions and a deterministic output digest support regeneration.

Model output never changes historical evidence or a canonical decision. When the adapter is unavailable, deterministic templates enumerate the available evidence with one citation per statement. The fallback is intentionally plain: readability cannot outrank evidence fidelity.
