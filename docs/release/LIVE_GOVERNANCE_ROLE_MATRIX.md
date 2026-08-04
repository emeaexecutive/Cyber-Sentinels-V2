# Live Governance Role Matrix

| Action | Permitted roles | Forbidden roles | Evidence required | Supersession rule |
| --- | --- | --- | --- | --- |
| Create tenant-scoped trust object | owner, admin | ordinary user, anonymous, external adviser | tenant scope + actor identity + evidence reference | create correction chain rather than overwrite |
| Issue authority lease | owner, admin, reviewer | ordinary user, anonymous | reviewer assignment + lease scope + evidence digest | revoked lease invalidates subsequent evaluations |
| Review scope continuity decision | technical reviewer, legal reviewer, security reviewer | ordinary user, anonymous, service process | reviewer role + correlation id + evidence snapshot | correction supersedes original |
| Create serious-incident decision | technical reviewer, legal reviewer, security reviewer, executive approver | ordinary user, anonymous, external adviser | reviewer assignment + evidence digest + provenance | original remains immutable |
| Approve package submission | regulator liaison, executive approver | ordinary user, anonymous, external adviser | liaison approval + evidence package reference | approved package remains immutable |
| Create evidence graph edge | service process, authorized reviewer | ordinary user, anonymous | tenant binding + edge type + evidence reference | supersession preserved |
| Execute service-only mutation | service process | ordinary user, anonymous, authenticated client | service-role boundary + audit correlation | append-only history preserved |
