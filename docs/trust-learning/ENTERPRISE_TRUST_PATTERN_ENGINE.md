# Enterprise Trust Pattern Engine

`EnterpriseTrustPatternEngine` is deterministic. It accepts normalized canonical-event references, excludes events outside the authenticated enterprise, applies bounded recurrence windows, groups on stable tenant/subject/workflow/provider keys, counts exact rules, and creates deterministic IDs and SHA-256 digests.

Patterns are derived conclusions—not observations. Every result retains subject, workflow, authority, policy, provider, incident, decision, event and evidence references available at detection time. A pattern requires at least two material events. Insufficient samples and `none` materiality noise produce no pattern.

Evidence strength and confidence are classifications, not universal scores. Confidence expresses coverage of the historical comparison only. Every pattern disclaims causation, future certainty, fraud, abuse and malicious-intent inference.

Corrections remain linked through canonical supersession references. The current projection is correctable; append-only pattern versions preserve prior derivations. The engine cannot mutate Trust Fabric decisions or policy.
