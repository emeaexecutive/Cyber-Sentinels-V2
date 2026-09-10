# V2 Operational Trust Intelligence foundation

V1 final main and immutable V2 base: `046662dbb372e78c8ca2fe8057e6afe9fd56eb78` (PR #83 merged with all required checks green). Historical NO-GO evidence is preserved unchanged. Production continues running V1 source `b0f6b37d41714efa940852b3ef955e9c7317c513`; main automatic deployment is disabled in `vercel.json`.

This branch implements foundation and Epic 1 only. Qualification is Staging-only (`agpyhygpfmppjkxwcpac`). Production `kecgtsfibkypjuaxqbjx` must not be mutated or promoted in this run. Implementation and qualification results are recorded separately; this design is not a claim of completion.

The immutable canonical trust transaction remains the authorization root. Observations, outcomes, incidents, interventions and later interpretations append evidence around it. ALLOW is not execution. Authentication, authority and purpose are separate. Correlation is not attribution.

Existing decision, receipt, Replay, Evidence Graph and Trust Memory remain canonical. V2 reads their references; it does not introduce another engine. Optional V2 context is never read by the normal V1 decision path. Missing context is UNKNOWN, with no implicit REVIEW or DENY. Future policy may explicitly require context; no behavioral policy or intelligence engine is introduced here.

The public API uses existing API-key authentication, tenant/client binding, rate limits and error responses. Incident read/write and export require explicitly issued scopes; old keys acquire no new scopes. Owner application access must use the existing workspace membership boundary.

World ID remains IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED. First-party control-plane evidence does not assert downstream execution or independent provider verification.


Staging signed-heartbeat qualification is explicitly opt-in with CONTROL_PLANE_STAGING_QUALIFICATION=true, CYBER_SENTINELS_ENVIRONMENT=staging, and the actual service-client database URL pinned to agpyhygpfmppjkxwcpac. The flag defaults false. Production signature, origin, environment, freshness and replay checks remain in force. This qualification switch is not a new production dependency.
