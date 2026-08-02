# Forward repair plan

A clean repository preview currently encounters incompatible historical definitions of `provider_health_snapshots` before reaching Epic 26. The approved repair is a new audited forward-only migration that inspects the existing shapes, chooses the canonical model without evidence loss, records the decision, and validates every dependent RPC and policy.

After that repair, run a clean isolated preview, then execute every validation script in the manifest. Until both steps succeed, this package is not approved for staging execution.
