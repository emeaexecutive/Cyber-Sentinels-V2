# External Agent quickstart

Cyber Sentinels evaluates an external AI agent's exact proposed action against current identity, authority, policy, and retained evidence. It returns canonical `ALLOW`, `REVIEW`, or `DENY`, plus a receipt and chronological Replay. It never executes the customer action. The TypeScript SDK, PowerShell script, and curl request examples use the same OpenAPI 3.1 public contract and canonical runtime; none has database or application privilege.

## 1. Create the API key

1. Sign in to a non-Production Cyber Sentinels deployment.
2. Open **Developer -> API Keys**.
3. For the complete Customer Zero Staging flow, create an owner/admin external-agent test key with the `CUSTOMER_ZERO_ADMIN` preset: `agents:write`, `agents:verify`, `authority:read`, `authority:write`, `trust:request`, `trust:read`, `evidence:write`, `outcomes:write`, `review:read`, and `review:write`. Persist a bounded authority-management boundary for the exact actions, target prefixes, purposes, environments, and maximum TTL used by the test. Ordinary Production integrations should remove every administration or evidence scope they do not use.
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

Test keys begin `cs_test_`; live keys begin `cs_live_`. A prefix does not select a host. The complete secret is shown once and cannot be recovered. If it is lost or may be exposed, use **Developer -> API Keys** to rotate it; the replacement is shown once and the previous key is revoked. Plan an expiry through the approved onboarding channel and rotate before it. Test the key only against the exact approved non-Production URL.

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

Credential, manifest, challenge, and proof payloads must be produced with the same externally held Ed25519 private key. The route inventory on `/developers/quickstart` lists every public operation, but it is not a pure-curl signing implementation. curl receives no signing shortcut or hidden privilege; use the TypeScript or PowerShell executable example to generate correctly canonicalized signatures, then use curl to inspect the same HTTP contract. A customer attempting the complete identity lifecycle with curl alone must supply an external Ed25519/canonical-JSON helper.

## Contract and decision semantics

`Agent Gamma requests read_repository on repository:a` always goes through `POST /api/v1/trust/decisions`. Registration creates identity state only. Current identity proof and a separately governed, bounded, expiring authority grant are both required, but identity proof does not itself create authority. A detector or provider result does not equal truth, and no client may supply verification, tenant, authority, trust-state, or ALLOW fields. The decision request does not accept `authority_reference`; the server resolves the agent's current authority. Only the canonical runtime derives ALLOW, REVIEW, or DENY.

`IDENTITY != AUTHORITY` and `VERIFIED != AUTHORIZED`. An authorized owner/admin principal may grant and revoke bounded versions through the dedicated authority routes. The acting agent still cannot import an authority reference or turn API scope into business authority.

Authority is continuously evaluated. `IDENTITY -> AUTHORITY -> INTENT -> CURRENT CONDITIONS -> CONSEQUENCE -> ALLOW | REVIEW | DENY` is one canonical path, not a chain of reusable approvals. At T1, Agent Alpha may have current identity and authority and receive `ALLOW`. If authority, its delegator, policy, evidence freshness, runtime/destination propagation, required approval, or another independently evidenced material condition changes at T2, submit a new request with a new idempotency key. That request may return `ALLOW`, `REVIEW`, or `DENY`. T2 does not reverse history: T1 remains the historical result for T1.

`PREVIOUS_ALLOW != STANDING_AUTHORIZATION`. `context.previous_transaction_id` links T1 for comparison only. Optional `intent_reference`, expected `authority_version`/`policy_version`, evidence and material-change references, and `human_approval_reference` are resolved against server-owned records. Client assertions remain `AGENT_ASSERTED`; saying “everything is fine” cannot create current proof or restore positive eligibility.

## First end-to-end integration

The executable TypeScript and PowerShell examples perform the signing lifecycle. After they return `agent_id`, the minimum customer proof is:

1. Retrieve `/api/v1/agents/{agentId}/authority` and retain the exact allowed action, target, environment, authority reference and version.
2. Submit that exact action to `/api/v1/trust/decisions` with a matching `Idempotency-Key` header and body value.
3. Require an `ALLOW` result and retain `decision_id`, `transaction_id`, `receipt_id`, `replay_id`, `request_id`, and `correlation_id`.
4. Retrieve the receipt and Replay URLs returned by the decision.
5. Submit an action outside the returned authority using a new idempotency key.
6. Require `DENY`, then retrieve the DENY receipt and Replay.

`REVIEW` is not `ALLOW`. Stop execution, persist its identifiers and reasons, and retrieve its receipt and Replay. Use `review_reference` to retrieve the governed review; only an authorized owner/admin/reviewer may resolve it. Even `APPROVED` leaves the original decision as REVIEW and requires a new canonical evaluation with a new idempotency key.

```bash
IDEMPOTENCY_KEY="agent-alpha-allow-001"
curl --fail-with-body -X POST "$CYBER_SENTINELS_BASE_URL/api/v1/trust/decisions" \
  -H "Authorization: Bearer $CYBER_SENTINELS_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  --data "{\"operational_entity_id\":\"$AGENT_ID\",\"action\":{\"type\":\"read_repository\",\"target\":\"repository:a\",\"purpose\":\"deployment_evidence_review\",\"environment\":\"staging\"},\"idempotency_key\":\"$IDEMPOTENCY_KEY\"}"

curl --fail-with-body \
  -H "Authorization: Bearer $CYBER_SENTINELS_API_KEY" \
  "$CYBER_SENTINELS_BASE_URL/api/v1/trust/transactions/$TRANSACTION_ID/receipt"

curl --fail-with-body \
  -H "Authorization: Bearer $CYBER_SENTINELS_API_KEY" \
  "$CYBER_SENTINELS_BASE_URL/api/v1/trust/transactions/$TRANSACTION_ID/replay"
```

```ts
const allowed = await client.decisions.create({
  operational_entity_id: agent.agent_id,
  action: {
    type: "read_repository",
    target: "repository:a",
    purpose: "deployment_evidence_review",
    environment: "staging",
  },
  idempotency_key: "agent-alpha-allow-001",
});
if (allowed.decision !== "ALLOW") throw new Error(`Expected ALLOW; correlation=${allowed.correlation_id}`);
const receipt = await client.transactions.receipt(allowed.transaction_id);
const replay = await client.transactions.replay(allowed.transaction_id);

// T2 is a new evaluation, not a replay or reversal of T1.
const reevaluated = await client.decisions.create({
  operational_entity_id: agent.agent_id,
  action: {
    type: "read_repository",
    target: "repository:a",
    purpose: "deployment_evidence_review",
    environment: "staging",
  },
  idempotency_key: "agent-alpha-t2-001",
  context: {
    intent_reference: "intent:deployment-review:42",
    previous_transaction_id: allowed.transaction_id,
    authority_version: allowed.authority_version ?? undefined,
  },
});
if (reevaluated.decision !== "ALLOW") {
  // REVIEW and DENY both stop execution.
  console.log(reevaluated.reason_codes);
}
```

```powershell
$headers = @{
  Authorization = "Bearer $env:CYBER_SENTINELS_API_KEY"
  "Content-Type" = "application/json"
  "Idempotency-Key" = "agent-alpha-deny-001"
}
$body = @{
  operational_entity_id = $agentId
  action = @{ type = "write_repository"; target = "repository:a"; purpose = "deployment_evidence_review"; environment = "staging" }
  idempotency_key = "agent-alpha-deny-001"
} | ConvertTo-Json -Depth 5
$deny = Invoke-RestMethod -Method Post -Uri "$env:CYBER_SENTINELS_BASE_URL/api/v1/trust/decisions" -Headers $headers -Body $body
if ($deny.decision -ne "DENY") { throw "Expected DENY; correlation=$($deny.correlation_id)" }
$denyReceipt = Invoke-RestMethod -Uri $deny.receipt_url -Headers @{ Authorization = "Bearer $env:CYBER_SENTINELS_API_KEY" }
$denyReplay = Invoke-RestMethod -Uri $deny.replay_url -Headers @{ Authorization = "Bearer $env:CYBER_SENTINELS_API_KEY" }
```

The SDK is repository-local and **UNPUBLISHED**. The public V1 material does not declare a standalone package/download channel; this example is usable only after the customer has received this repository through its onboarding arrangement. Use the example's `file:../../packages/cyber-sentinels-sdk` dependency and do not install the package name from a public registry. Its V1 date is pinned to `2026-08-29`; an advertised incompatible V1 date fails with `API_VERSION_MISMATCH`. For the complete schemas and ALLOW/REVIEW/DENY examples, retrieve `/api/v1/openapi.json`. For corrective actions and retryability, see [`API_V1_CUSTOMER_ERROR_GUIDE.md`](API_V1_CUSTOMER_ERROR_GUIDE.md).

## Production safety

Before Production, prove the journey in the exact approved non-Production environment, including ALLOW, REVIEW, DENY, tenant/client isolation, receipt/Replay reads, idempotent timeout retry, 429 `Retry-After`, and bounded handling of 500/503. Current rate limits are configurable route-class limits, not permanent commercial promises.

Cyber Sentinels does not choose the customer's continuity policy. The integrating system must define its timeout budget, bounded retries, operator escalation, and downstream stop behavior. `NO RESPONSE != ALLOW` and `TRUST SERVICE UNAVAILABLE != TRUST APPROVED`. For a timed-out decision, retry the unchanged body with the same idempotency key. Never fail open merely because DNS, the network, or Cyber Sentinels is unavailable.
