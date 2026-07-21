# Trust Policy Resolution

Resolution order is platform default, enterprise override, domain policy, workflow policy, authority policy, then runtime exception. `src/lib/trust-policy/policy-resolution.ts` filters policies by tenant, scope and validity interval, applies layers deterministically, and hashes the result.

A platform default is mandatory. Invalid policies cannot resolve or activate. PATCH creates a successor version; historical decisions retain their original policy ID/version. Every persisted version is accompanied by a Canonical Trust Event.
