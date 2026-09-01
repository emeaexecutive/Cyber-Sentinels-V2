# Agent Gamma

Gamma is a separate Node process that imports only `@cyber-sentinels/sdk` and
uses HTTP. It has no database client, Supabase credential, service-role key,
server-function import, or verification fixture.

```bash
npm install
CYBER_SENTINELS_API_KEY="<shown-once-test-key>" \
CYBER_SENTINELS_BASE_URL="https://<approved-non-production-host>" \
CYBER_SENTINELS_STAGING_PROJECT_REF="agpyhygpfmppjkxwcpac" \
I_CONFIRM_STAGING="I_CONFIRM_STAGING" \
npm start
```

Set `GAMMA_RUN_ATTACKS=1` to add wrong-private-key and challenge-replay checks.
The owner/admin Customer Zero API key must include the scopes used by the full
proof: `agents:write`, `agents:verify`, `authority:read`, `authority:write`,
`trust:request`, `trust:read`, `outcomes:write`, `review:read`, and
`review:write`. Its server-persisted authority-management boundary must permit
`read_repository`, `repository:` targets, `deployment_evidence_review`, the
`staging` environment, and the requested one-hour TTL. Ordinary agent keys
should omit administrative scopes. Obtain the exact URL from the approved
Staging deployment manifest. A Vercel SSO
redirect means external qualification is blocked until an approved automation
bypass or externally reachable non-Production API endpoint exists.
The script refuses Production domains, Production/live API keys, and any
project reference other than the declared Staging project. It exits before
registration unless `/api/ready` returns `READY`, and it never prints secrets.
It records redacted identifiers for grant/history, ALLOW, REVIEW resolution,
fresh post-review evaluation, revocation, and post-revocation DENY. Review
approval never mutates the original REVIEW or authorizes execution by itself.

For the standalone PowerShell equivalent, see `../powershell/README.md`.
