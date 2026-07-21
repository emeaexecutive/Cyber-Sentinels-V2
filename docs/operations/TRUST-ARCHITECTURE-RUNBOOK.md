# Trust Architecture Operations Runbook

Monitor state-engine RPC failures, chain contention, invalid transitions, stale evidence, unresolved conflicts, provider health and simulation isolation. A consensus recommendation without a linked state decision is a recoverable operational exception; retry the Trust State Engine with the same contract and correlation ID.

For suspected integrity failure: stop state mutations, preserve logs/correlation IDs, verify event and decision hashes, compare chain heads, inspect tenant scope, and do not rewrite history. Corrective actions create new evidence, policy versions or decisions.

For revocation: confirm the authoritative evidence, apply `REVOKED`, verify its Canonical Trust Event and read model, then test that recovery attempts fail.
