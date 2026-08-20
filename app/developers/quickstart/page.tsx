import Link from "next/link";

const code = "rounded-xl border border-zinc-800 bg-black p-4 font-mono text-xs leading-6 text-cyan-100 overflow-x-auto whitespace-pre";

export default function DeveloperQuickstartPage() {
  const base = "https://<approved-non-production-host>";
  return <main className="min-h-screen bg-[#04070c] px-6 py-14 text-white"><div className="mx-auto max-w-5xl">
    <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">External Agent Trust API - v0.1.0</p><h1 className="mt-3 text-4xl font-semibold">Connect Agent Gamma</h1>
    <p className="mt-4 max-w-3xl text-zinc-400">Gamma is a separate process. It creates its own Ed25519 private key, sends only the public JWK and signatures, and uses the public SDK/HTTP API. Identity proof does not let Gamma declare itself trusted.</p>
    <div className="mt-5 flex gap-4 text-sm"><Link className="underline" href="/developers/api-keys">Create API key</Link><a className="underline" href="/api/v1/openapi.json">OpenAPI 3.1 JSON</a></div>
    <ol className="mt-10 grid gap-8">
      <li><h2 className="text-xl font-semibold">1. Create a scoped API key</h2><p className="mt-2 text-sm text-zinc-400">Sign in, open Developer / API Keys, select all six Gamma scopes, create the key, and copy the one-time secret. Keep it in a shell or server-side secret store, never source control.</p><p className="mt-2 text-xs text-amber-200">Required scopes: agents:write, agents:verify, authority:read, trust:request, trust:read, outcomes:write.</p></li>
      <li><h2 className="text-xl font-semibold">2. Install the SDK</h2><pre className={`${code} mt-3`}>npm install @cyber-sentinels/sdk</pre></li>
      <li><h2 className="text-xl font-semibold">3-6. Register, bind a credential and signed manifest, then prove possession</h2><pre className={`${code} mt-3`}>{`import { CyberSentinels, signManifest, signChallenge } from "@cyber-sentinels/sdk";
const cs = new CyberSentinels({ apiKey: process.env.CYBER_SENTINELS_API_KEY, baseUrl: "${base}" });
const keys = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
const gamma = await cs.agents.register({ display_name: "Agent Gamma", entity_type: "AI_AGENT", owner_reference: "owner:gamma", runtime: { environment: "staging", framework: "custom" }, model: { provider: "declared-provider", identifier: "declared-model" } });
const credential = await cs.agents.registerCredential(gamma.agent_id, { public_jwk: await crypto.subtle.exportKey("jwk", keys.publicKey), kid: "gamma-key-1", algorithm: "Ed25519" });
const signed = await signManifest(manifestClaims, keys.privateKey);
await cs.agents.registerManifest(gamma.agent_id, signed);
const challenge = await cs.agents.issueChallenge(gamma.agent_id);
await cs.agents.submitProof(gamma.agent_id, await signChallenge(challenge, gamma.manifest_context.enterprise_id, credential.credential_id, keys.privateKey));`}</pre></li>
      <li><h2 className="text-xl font-semibold">7-8. Request an exact action and handle every decision</h2><pre className={`${code} mt-3`}>{`const request = { operational_entity_id: gamma.operational_entity_id, action: { type: "read_repository", target: "repository:a", purpose: "deployment_evidence_review", environment: "staging" }, idempotency_key: "gamma-action-001" };
const result = await cs.trust.authorize(request);
const retry = await cs.trust.authorize(request); // same logical transaction
if (result.decision !== "ALLOW") { /* stop or enter human review */ }
// authorize() never executes customer code.`}</pre></li>
      <li><h2 className="text-xl font-semibold">9-10. Retrieve canonical records</h2><pre className={`${code} mt-3`}>{`await cs.trust.getTransaction(result.transaction_id);
await cs.trust.getReplay(result.transaction_id);
await cs.trust.getReceipt(result.transaction_id);
await cs.agents.getTrustState(gamma.agent_id);`}</pre></li>
    </ol>
    <section className="mt-12"><h2 className="text-2xl font-semibold">PowerShell quickstart</h2><p className="mt-2 text-sm text-zinc-400">Use the repository-owned script. It validates configuration and API identity before registration, keeps its Ed25519 private key external, rejects Production, detects Vercel SSO, and exits non-zero on the first failure.</p><pre className={`${code} mt-4`}>{`$env:CYBER_SENTINELS_BASE_URL="${base}"
$env:CYBER_SENTINELS_API_KEY="<paste the one-time secret>"
pwsh -NoProfile -File ./examples/powershell/agent-gamma.ps1`}</pre></section>
    <section className="mt-12"><h2 className="text-2xl font-semibold">Provider-neutral evidence</h2><p className="mt-2 text-sm text-zinc-400">Use an EVIDENCE_PROVIDER key. The server derives tenant, receipt time, verification state and canonical result; the provider cannot submit a Cyber Sentinels decision.</p><pre className={`${code} mt-4`}>{`await cs.evidence.submit({
  provider: { key: "mythos-compatible-test-provider", class: "AI_ASSURANCE_PROVIDER", event_id: "assessment-001", finding: "ASSURANCE_ASSESSMENT" },
  type: "CAPABILITY_EVALUATION",
  subject: { type: "AI_AGENT", id: gamma.operational_entity_id },
  evidence: { model_version: "v2", environment: "preview", confidence: "high" }
});

await cs.outcomes.submit({ transactionId: result.transaction_id, outcome: "SUCCEEDED", evidence: { destination: "repository:a", target: "repository:a", reference: "destination:event-001" } });`}</pre></section>
    <section className="mt-12"><h2 className="text-2xl font-semibold">Equivalent curl sequence</h2><pre className={`${code} mt-4`}>{`export CS_BASE="${base}"
export CS_KEY="<shown-once-key>"
curl -X POST "$CS_BASE/api/v1/agents" -H "Authorization: Bearer $CS_KEY" -H "Content-Type: application/json" --data '{"display_name":"Agent Gamma","entity_type":"AI_AGENT","owner_reference":"owner:gamma","runtime":{"environment":"staging","framework":"custom"},"model":{"provider":"declared-provider","identifier":"declared-model"}}'
curl -X POST "$CS_BASE/api/v1/agents/$AGENT_ID/credentials" -H "Authorization: Bearer $CS_KEY" -H "Content-Type: application/json" --data @credential.json
curl -X POST "$CS_BASE/api/v1/agents/$AGENT_ID/manifest" -H "Authorization: Bearer $CS_KEY" -H "Content-Type: application/json" --data @signed-manifest.json
curl -X POST "$CS_BASE/api/v1/agents/$AGENT_ID/challenge" -H "Authorization: Bearer $CS_KEY" -H "Content-Type: application/json" --data '{}'
curl -X POST "$CS_BASE/api/v1/agents/$AGENT_ID/proof" -H "Authorization: Bearer $CS_KEY" -H "Content-Type: application/json" --data @proof.json
curl "$CS_BASE/api/v1/agents/$AGENT_ID/authority" -H "Authorization: Bearer $CS_KEY"
curl "$CS_BASE/api/v1/agents/$AGENT_ID/trust-state" -H "Authorization: Bearer $CS_KEY"
curl -X POST "$CS_BASE/api/v1/trust/decisions" -H "Authorization: Bearer $CS_KEY" -H "Idempotency-Key: gamma-action-001" -H "Content-Type: application/json" --data '{"operational_entity_id":"'$AGENT_ID'","action":{"type":"read_repository","target":"repository:a","purpose":"deployment_evidence_review","environment":"staging"},"idempotency_key":"gamma-action-001"}'
curl -X POST "$CS_BASE/api/v1/evidence" -H "Authorization: Bearer $CS_EVIDENCE_KEY" -H "Content-Type: application/json" --data @provider-evidence.json
curl "$CS_BASE/api/v1/trust/transactions/$TRANSACTION_ID" -H "Authorization: Bearer $CS_KEY"
curl "$CS_BASE/api/v1/trust/transactions/$TRANSACTION_ID/replay" -H "Authorization: Bearer $CS_KEY"
curl "$CS_BASE/api/v1/trust/transactions/$TRANSACTION_ID/receipt" -H "Authorization: Bearer $CS_KEY"
curl -X POST "$CS_BASE/api/v1/trust/transactions/$TRANSACTION_ID/outcomes" -H "Authorization: Bearer $CS_KEY" -H "Content-Type: application/json" --data @outcome.json`}</pre></section>
    <p className="mt-8 text-sm text-zinc-500">Use OpenAPI as the contract source of truth. Obtain the exact non-Production URL from the PR Vercel Preview check; do not guess it. A protected Preview that redirects to Vercel Login is not an externally usable API endpoint unless an approved automation bypass is already configured. 429 responses include Retry-After. Errors use <code>{`{"error":{"code","message","correlation_id"}}`}</code>.</p>
  </div></main>;
}
