# Agent Gamma

Gamma is a separate Node process that imports only `@cyber-sentinels/sdk` and
uses HTTP. It has no database client, Supabase credential, service-role key,
server-function import, or verification fixture.

```bash
npm install
CYBER_SENTINELS_API_KEY=... \
CYBER_SENTINELS_BASE_URL=https://preview.example \
npm start
```

Set `GAMMA_RUN_ATTACKS=1` to add wrong-private-key and challenge-replay checks.
The API key must include all six v0.1 scopes for the full proof.
