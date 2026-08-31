import Link from "next/link";

const code = "overflow-x-auto whitespace-pre rounded-xl border border-zinc-800 bg-black p-4 font-mono text-xs leading-6 text-cyan-100";

export default function DeveloperQuickstartPage() {
  return <main className="min-h-screen bg-[#04070c] px-6 py-14 text-white">
    <div className="mx-auto max-w-5xl">
      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">External Agent Trust API · V1</p>
      <h1 className="mt-3 text-4xl font-semibold">Agent Alpha: decision, receipt, Replay</h1>
      <p className="mt-4 max-w-3xl text-zinc-400">This executable non-Production journey creates an API-client-bound agent, proves Ed25519 key possession, grants bounded expiring authority through an authorized administrator, then requests ALLOW and DENY from the canonical Trust Fabric. Registration does not prove identity or grant authority, and every later consequential action requires fresh evaluation.</p>
      <div className="mt-5 flex gap-4 text-sm"><Link className="underline" href="/developers/api-keys">Create API key</Link><a className="underline" href="/api/v1/openapi.json">OpenAPI 3.1 JSON</a></div>

      <ol className="mt-10 grid gap-8">
        <li><h2 className="text-xl font-semibold">1. Create scoped test keys</h2><p className="mt-2 text-sm text-zinc-400">Sign in, open Developer → API Keys, and use least privilege. The agent flow needs agents:write, agents:verify, authority:read, trust:request, trust:read and outcomes:write. Authority management and governed review use separate owner/admin keys with authority:write and review:read/review:write. Keep shown-once keys in server-side environment variables. If one is lost, rotate it; it cannot be displayed again. The script refuses live keys and Production hosts.</p></li>
        <li><h2 className="text-xl font-semibold">2. Run the repository-local SDK example</h2><p className="mt-2 text-sm text-amber-200">The SDK is not published to npm. This command installs the repository-local file dependency.</p><pre className={`${code} mt-3`}>{`npm --prefix examples/agent-gamma install
$env:CYBER_SENTINELS_BASE_URL="https://<exact-approved-preview>"
$env:CYBER_SENTINELS_API_KEY="<shown-once-test-key>"
$env:CYBER_SENTINELS_STAGING_PROJECT_REF="agpyhygpfmppjkxwcpac"
$env:CYBER_SENTINELS_CONFIRM_STAGING="I_CONFIRM_STAGING"
npm --prefix examples/agent-gamma start`}</pre></li>
        <li><h2 className="text-xl font-semibold">3. Use the returned public identifiers</h2><pre className={`${code} mt-3`}>{`const agent = await cs.agents.get(agentId);
const authority = await cs.authority.get(agentId);
const result = await cs.trust.requestDecision({
  operational_entity_id: agentId,
  action: { type: "read_repository", target: "repository:a", purpose: "deployment_evidence_review", environment: "staging" },
  idempotency_key: "agent-alpha-read-001"
});
// REVIEW and DENY are completed evaluations, but neither permits execution.
if (result.decision !== "ALLOW") throw new Error("Stop execution: " + result.decision);
await cs.trust.getReceipt(result.transaction_id);
await cs.trust.getReplay(result.transaction_id);`}</pre><p className="mt-3 text-sm text-zinc-400">The decision request does not accept an authority reference. Cyber Sentinels resolves the current authority for the agent.</p></li>
      </ol>

      <section className="mt-12"><h2 className="text-2xl font-semibold">Client evidence is assertion, not proof</h2><p className="mt-2 text-sm text-zinc-400">Only submit evidence for an agent registered to the same API client. The public route derives the provider identity from the API key and stores the result as AGENT_ASSERTED / INCONCLUSIVE. Verified provider and native evidence use their existing authenticated server paths.</p><pre className={`${code} mt-4`}>{`await cs.evidence.submit({
  provider: { key: "self", class: "APPLICATION_SIGNAL", event_id: "alpha-log-001", finding: "ACTION_PLANNED" },
  type: "AGENT_ACTIVITY_LOG",
  subject: { type: "AI_AGENT", id: agentId },
  evidence: { action: "read_repository", target: "repository:a" }
});`}</pre></section>

      <section className="mt-12"><h2 className="text-2xl font-semibold">Exact V1 routes</h2><pre className={`${code} mt-4`}>{`POST /api/v1/agents
GET  /api/v1/agents/{agentId}
POST /api/v1/agents/{agentId}/credentials
POST /api/v1/agents/{agentId}/manifest
POST /api/v1/agents/{agentId}/challenge
POST /api/v1/agents/{agentId}/proof
GET  /api/v1/agents/{agentId}/authority
GET  /api/v1/agents/{agentId}/authorities
POST /api/v1/agents/{agentId}/authorities
GET  /api/v1/agents/{agentId}/authorities/{authorityId}
POST /api/v1/agents/{agentId}/authorities/{authorityId}/revoke
GET  /api/v1/agents/{agentId}/trust-state
POST /api/v1/trust/decisions
GET  /api/v1/reviews/{reviewReference}
POST /api/v1/reviews/{reviewReference}/resolve
POST /api/v1/evidence
GET  /api/v1/trust/transactions/{transactionId}
GET  /api/v1/trust/transactions/{transactionId}/receipt
GET  /api/v1/trust/transactions/{transactionId}/replay
POST /api/v1/trust/transactions/{transactionId}/outcomes
GET  /api/v1/openapi.json`}</pre></section>

      <section id="safe-failure" className="mt-12"><h2 className="text-2xl font-semibold">Safe failure handling</h2><p className="mt-2 text-sm text-zinc-400">A DNS failure, timeout, 429, 500, or 503 is not an approval. Use bounded retries; for a timed-out decision, reuse the same idempotency key with the unchanged body. Honor Retry-After on 429. REVIEW stops execution. An authorized reviewer may record a governed resolution, but even APPROVED requires a new canonical evaluation under current conditions and never rewrites the original REVIEW.</p><Link className="mt-3 inline-flex text-sm text-cyan-200 underline" href="/developers/docs#error-guide">Open the customer error guide</Link></section>

      <p className="mt-8 text-sm text-zinc-500">The smoke test first requires <code>/api/ready</code> to return READY. It never prints API keys or private-key material. A protected Preview that redirects to Vercel Login is not externally consumable without an already-approved automation bypass. The SDK is not published and V1 does not name a standalone download channel; this example is usable only after the repository has been supplied through customer onboarding.</p>
    </div>
  </main>;
}
