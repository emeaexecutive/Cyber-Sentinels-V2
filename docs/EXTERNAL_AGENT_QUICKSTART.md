# External Agent quickstart

The TypeScript SDK, PowerShell script, and curl examples use the same OpenAPI 3.1 public contract and canonical runtime. None has database or application privilege.

## 1. Create the API key

1. Sign in to a non-Production Cyber Sentinels deployment.
2. Open **Developer -> API Keys**.
3. Create an external-agent test key and select all six scopes: `agents:write`, `agents:verify`, `authority:read`, `trust:request`, `trust:read`, and `outcomes:write`.
4. Copy the value under **SECRET SHOWN ONCE**. Cyber Sentinels stores the scrypt hash, prefix, lifecycle state, and scopes; it does not persist the plaintext secret.

Keep the value in a shell or secret manager. Never place it in source files:

```powershell
$env:CYBER_SENTINELS_BASE_URL="https://<approved-non-production-host>"
$env:CYBER_SENTINELS_API_KEY="<paste the one-time secret>"
```

```bash
export CYBER_SENTINELS_BASE_URL="https://<approved-non-production-host>"
export CYBER_SENTINELS_API_KEY="<paste the one-time secret>"
```

Obtain the URL from the PR's successful Vercel Preview deployment/check. Do not guess a preview hostname. Preview deployment success and public API reachability are separate facts: a `302` to `vercel.com/sso-api` means the external client is blocked by Vercel Authentication. Use only an already-approved automation bypass supplied through `VERCEL_AUTOMATION_BYPASS_SECRET`; never disable API authentication or tenant controls, and never print or persist that value.

## 2. TypeScript

The complete executable example is in `examples/agent-gamma`:

```bash
cd examples/agent-gamma
npm install
npm start
```

Gamma generates its Ed25519 key inside its own Node process, registers only the public JWK, signs its manifest and challenge, and sends requests through `@cyber-sentinels/sdk`.

## 3. PowerShell

The complete executable example is `examples/powershell/agent-gamma.ps1`:

```powershell
pwsh -NoProfile -File ./examples/powershell/agent-gamma.ps1
```

See `examples/powershell/README.md` for prerequisites, preflight behavior, Vercel constraints, and output markers.

## 4. curl

curl uses the same paths, Bearer key, JSON bodies, and `Idempotency-Key` header documented by `/api/v1/openapi.json`. Registration begins with:

```bash
curl --fail-with-body -X POST "$CYBER_SENTINELS_BASE_URL/api/v1/agents" \
  -H "Authorization: Bearer $CYBER_SENTINELS_API_KEY" \
  -H "Content-Type: application/json" \
  --data '{"display_name":"Agent Gamma","entity_type":"AI_AGENT","owner_reference":"owner:gamma","runtime":{"environment":"staging","framework":"custom"},"model":{"provider":"declared-provider","identifier":"declared-model"}}'
```

Credential, manifest, challenge, and proof payloads must be produced with the same externally held Ed25519 private key. The curl sequence on `/developers/quickstart` lists every public operation. curl receives no signing shortcut or hidden privilege; use the TypeScript or PowerShell executable example to generate correctly canonicalized signatures.

## Contract and decision semantics

`Agent Gamma requests read_repository on repository:a` always goes through `POST /api/v1/trust/decisions`. Identity proof does not create authority, a detector or provider result does not equal truth, and no client may supply verification, tenant, trust-state, or ALLOW fields. Only the canonical runtime derives ALLOW, REVIEW, or DENY.
