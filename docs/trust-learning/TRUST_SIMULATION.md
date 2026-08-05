# Trust Simulation

Enterprise Trust Learning simulations operate on an immutable snapshot and support bounded authority-expiry, provider-outage, delegated-agent-impact and economic-limit questions. They identify assumptions, affected Trust Objects/workflows, changed derived outcomes, uncertainty and source references.

The simulator hashes both snapshot and result, reports `canonicalStateMutationCount: 0`, and does not call canonical write paths. An affected allow/review workflow moves only to a simulated review state; an existing deny remains deny. Effects outside the captured snapshot are unknown. Unconstrained hypothetical generation is not supported.
