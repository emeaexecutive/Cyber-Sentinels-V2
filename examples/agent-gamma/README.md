# Agent Gamma

Gamma is a separate Node process that imports only `@cyber-sentinels/sdk` and
uses HTTP. It has no database client, Supabase credential, service-role key,
server-function import, or verification fixture.

```bash
npm install
CYBER_SENTINELS_API_KEY="<shown-once-test-key>" \
CYBER_SENTINELS_BASE_URL="https://<approved-non-production-host>" \
npm start
```

Set `GAMMA_RUN_ATTACKS=1` to add wrong-private-key and challenge-replay checks.
The API key must include all six v0.1 scopes for the full proof: `agents:write`,
`agents:verify`, `authority:read`, `trust:request`, `trust:read`, and
`outcomes:write`. Obtain the exact URL from the PR Preview check. A Vercel SSO
redirect means external qualification is blocked until an approved automation
bypass or externally reachable non-Production API endpoint exists.

For the standalone PowerShell equivalent, see `../powershell/README.md`.
