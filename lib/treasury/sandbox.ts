import { createPublicKey, randomUUID, verify, type KeyObject } from "node:crypto";
import { evaluateAuthorityGraph, type AuthorityGraphRequest } from "../core/authority-graph.ts";
import { appendSwarmEvent, verifySwarmReplay, type Actor, type SwarmState, type SwarmStore } from "../swarm/containment.ts";
import { signAuthorityReceipt, type AuthorityReceiptSignature } from "../trust-receipts/authority-signature.ts";
import { canonicalize } from "../../src/lib/trust-core/canonicalize.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

export type Payment = {
  tenantId: string; agentId: string; requestId: string; amountMinor: number;
  currency: string; asset: string; network: string; chainId: string; contract: string;
  beneficiary: string; destination: string; provider: string; policyVersion: string;
  expiresAt: number; environment: "sandbox";
};
export type SignedPayment = { payment: Payment; signature: string };
export type FinancialPolicy = {
  id: string; version: string; transactionLimit: number; dailyLimit: number;
  rollingLimit: number; rollingMs: number; approvalThreshold: number;
  mandateTtlMs: number; velocityLimit: number; stopped: boolean;
  routes: Array<Pick<Payment, "currency" | "asset" | "network" | "chainId" | "contract" | "beneficiary" | "destination" | "provider">>;
};
type Mandate = { id: string; digest: string; payment: Payment; policyId: string; keyVersion: number; expiresAt: number; createdAt: number; consumed: boolean };
type Approval = { actorId: string; expiresAt: number; policyVersion: string };
export type DestinationEffect = { id: string; requestId: string; mandateId: string; digest: string; payment: Payment; at: number; synthetic: true };
type Ledger = { mandates: Record<string, Mandate>; approvals: Record<string, Approval[]>; effects: DestinationEffect[]; policy?: FinancialPolicy };
type State = SwarmState & { financial?: Ledger };
export type FinancialDecision = {
  decision: "ALLOW" | "REVIEW" | "DENY"; reasons: string[]; mandateId: string | null;
  effectId: string | null; event: Record<string, unknown>; signature: AuthorityReceiptSignature;
};
export const paymentSigningPayload = (payment: Payment) => canonicalize({ domain: "cyber-sentinels:treasury-sandbox:v1", payment });
const digestOf = (p: Payment) => hashCanonical({ domain: "cyber-sentinels:treasury-sandbox:v1", payment: p });
const ledgerOf = (s: SwarmState) => ((s as State).financial ??= { mandates: {}, approvals: {}, effects: [] });
const routeFields = ["currency", "asset", "network", "chainId", "contract", "beneficiary", "destination", "provider"] as const;
const positive = (n: number) => Number.isSafeInteger(n) && n > 0;

/** Sandbox only. Identity/authority come from existing server-owned records.
 * The controlled destination effect and mandate consumption commit in the SAME
 * existing SWARM CAS transaction. No arbitrary external adapter is accepted.
 */
export class TreasurySandbox {
  constructor(private readonly deps: {
    store: SwarmStore; now(): number; policy(tenant: string): FinancialPolicy;
    authority(state: SwarmState, payment: Payment): AuthorityGraphRequest;
    authenticate(proof: string): Promise<Actor | null>;
    approverActive(tenant: string, id: string): boolean;
    signingKey: KeyObject; signingKeyId: string;
  }) {}

  private identity(state: SwarmState, signed: SignedPayment) {
    const { payment: p, signature } = signed, now = this.deps.now(), reasons: string[] = [];
    const member = state.members[p.agentId], collective = member && state.collectives[member.swarmId];
    if (p.tenantId !== state.tenantId || p.environment !== "sandbox" || !positive(p.amountMinor)
      || !Number.isFinite(p.expiresAt) || p.expiresAt <= now || p.expiresAt > now + 300000
      || !/^[A-Za-z0-9_.:-]{8,120}$/.test(p.requestId)) reasons.push("PAYMENT_INVALID");
    if (!member || member.state !== "ACTIVE" || !Number.isFinite(member.expiresAt) || member.expiresAt <= now || !member.runtimePublicKeyPem
      || !collective || collective.state !== "ACTIVE" || !collective.responsiblePrincipalId
      || state.quarantines.some(q => q.kind === "agent" ? q.id === p.agentId : q.kind === "swarm" ? q.id === member.swarmId : q.kind === "workflow" ? q.id === collective.workflowId : true)) reasons.push("AGENT_INACTIVE");
    try {
      if (!member?.runtimePublicKeyPem || !/^[A-Za-z0-9_-]{86}$/.test(signature)
        || !verify(null, Buffer.from(paymentSigningPayload(p)), createPublicKey(member.runtimePublicKeyPem), Buffer.from(signature, "base64url"))) reasons.push("PROOF_OF_POSSESSION_INVALID");
    } catch { reasons.push("PROOF_OF_POSSESSION_INVALID"); }
    try {
      const graph = this.deps.authority(state, p);
      const evaluated = evaluateAuthorityGraph({ ...graph, evaluatedAt: new Date(now).toISOString() });
      if (graph.tenantId !== state.tenantId || graph.subjectId !== p.agentId || graph.action !== "PAYMENT"
        || graph.resource !== p.destination || graph.purpose !== "TREASURY_PAYMENT"
        || graph.workflowId !== collective?.workflowId || !evaluated.valid
        || evaluated.chain[0]?.id !== collective?.originalAuthority
        || !["human", "organization"].includes(evaluated.chain[0]?.grantorType)
        || evaluated.chain[0]?.grantorId !== collective?.responsiblePrincipalId) reasons.push("AUTHORITY_INVALID");
      const execution = collective?.executionPolicy;
      if (!execution || !execution.environments.includes("sandbox") || !execution.allowedTools.includes("PAYMENT") || !execution.resources.includes(p.destination)) reasons.push("EXECUTION_SCOPE_DENIED");
    } catch { reasons.push("AUTHORITY_UNAVAILABLE"); }
    return reasons;
  }

  private financial(state: SwarmState, p: Payment, exclude?: string) {
    const now = this.deps.now(), l = ledgerOf(state), reasons: string[] = [];
    const policy = l.policy ??= structuredClone(this.deps.policy(state.tenantId));
    if (![policy.transactionLimit, policy.dailyLimit, policy.rollingLimit, policy.rollingMs, policy.approvalThreshold, policy.mandateTtlMs, policy.velocityLimit].every(positive)
      || policy.mandateTtlMs > 300000 || !policy.id || !policy.version
      || !policy.routes.length || policy.routes.some(r => r.currency !== policy.routes[0].currency || r.asset !== policy.routes[0].asset)) reasons.push("POLICY_INVALID");
    if (policy.stopped) reasons.push("EMERGENCY_STOP");
    if (p.policyVersion !== policy.version) reasons.push("POLICY_CHANGED");
    if (p.amountMinor > policy.transactionLimit) reasons.push("TRANSACTION_LIMIT");
    if (!policy.routes.some(r => routeFields.every(k => typeof r[k] === "string" && r[k] === p[k]))) reasons.push("DESTINATION_OR_ASSET_DENIED");
    const reservations = Object.values(l.mandates).filter(m => !m.consumed && m.id !== exclude && m.expiresAt > now && m.policyId === policy.id);
    const committed = l.effects.filter(e => l.mandates[e.mandateId]?.policyId === policy.id);
    const dayStart = Math.floor(now / 86400000) * 86400000;
    const exposures = [...committed.map(e => ({ at: e.at, amount: e.payment.amountMinor })), ...reservations.map(m => ({ at: m.createdAt, amount: m.payment.amountMinor }))];
    // Reservations remain chargeable even across a UTC day/window transition.
    const sum = (start: number) => exposures.filter(e => e.at >= start).reduce((n, e) => n + BigInt(e.amount), BigInt(0))
      + reservations.filter(m => m.createdAt < start).reduce((n, m) => n + BigInt(m.payment.amountMinor), BigInt(0));
    if (positive(p.amountMinor) && positive(policy.dailyLimit) && sum(dayStart) + BigInt(p.amountMinor) > BigInt(policy.dailyLimit)) reasons.push("DAILY_LIMIT");
    if (positive(p.amountMinor) && positive(policy.rollingLimit) && sum(now - policy.rollingMs) + BigInt(p.amountMinor) > BigInt(policy.rollingLimit)) reasons.push("ROLLING_LIMIT");
    if (exposures.filter(e => e.at >= now - policy.rollingMs).length >= policy.velocityLimit) reasons.push("PAYMENT_VELOCITY");
    const approvals = (l.approvals[digestOf(p)] ?? []).filter(a => a.expiresAt > now && a.policyVersion === policy.version && this.deps.approverActive(state.tenantId, a.actorId));
    if (p.amountMinor >= policy.approvalThreshold && new Set(approvals.map(a => a.actorId)).size < 2) reasons.push("DUAL_APPROVAL_REQUIRED");
    return { reasons, policy };
  }

  private record(state: SwarmState, p: Payment, decision: FinancialDecision["decision"], reasons: string[], mandateId: string | null = null, effectId: string | null = null) {
    const event = appendSwarmEvent(state, this.deps.now(), `FINANCIAL_${decision}`, p.agentId, p.requestId, { digest: digestOf(p), decision, reasons, mandateId, effectId, synthetic: true, defensiveStage: decision === "DENY" ? "CHALLENGE" : decision === "REVIEW" ? "AUTHORISED_INTERVENTION" : "PROVE" });
    return { decision, reasons, mandateId, effectId, event, signature: signAuthorityReceipt(event, { tenantId: state.tenantId, receiptId: event.digest, keyId: this.deps.signingKeyId, privateKey: this.deps.signingKey }) };
  }

  async approve(tenant: string, proof: string, p: Payment, expiresAt: number) {
    const actor = await this.deps.authenticate(proof);
    if (!actor || actor.tenantId !== tenant || actor.kind !== "human" || actor.controlledBy.length
      || !actor.permissions.includes("swarm:approve") || !Number.isFinite(actor.expiresAt) || actor.expiresAt <= this.deps.now() || actor.id === p.agentId
      || expiresAt <= this.deps.now() || expiresAt > this.deps.now() + 300000) throw Error("INDEPENDENT_APPROVER_REQUIRED");
    return this.deps.store.transact(tenant, state => {
      const policy = ledgerOf(state).policy ??= structuredClone(this.deps.policy(tenant));
      if (p.tenantId !== tenant || p.policyVersion !== policy.version) throw Error("APPROVAL_BINDING_INVALID");
      const l = ledgerOf(state), digest = digestOf(p), approvals = l.approvals[digest] ??= [];
      if (approvals.some(a => a.actorId === actor.id)) throw Error("DUPLICATE_APPROVER");
      approvals.push({ actorId: actor.id, expiresAt, policyVersion: p.policyVersion });
      return appendSwarmEvent(state, this.deps.now(), "FINANCIAL_APPROVAL", actor.id, p.requestId, { digest, expiresAt, policyVersion: p.policyVersion });
    });
  }

  async configure(tenant: string, proof: string, policy: FinancialPolicy) {
    const actor = await this.deps.authenticate(proof);
    if (!actor || actor.tenantId !== tenant || actor.kind !== "human" || actor.controlledBy.length
      || !actor.permissions.includes("swarm:manage") || actor.expiresAt <= this.deps.now()) throw Error("POLICY_OPERATOR_REQUIRED");
    const immutable = structuredClone(policy);
    return this.deps.store.transact(tenant, s => {
      const prior = ledgerOf(s).policy;
      if (prior && (prior.id !== immutable.id || prior.version === immutable.version)) throw Error("NEW_POLICY_VERSION_REQUIRED");
      ledgerOf(s).policy = immutable;
      return appendSwarmEvent(s, this.deps.now(), "FINANCIAL_POLICY_CHANGED", actor.id, immutable.id, { version: immutable.version, stopped: immutable.stopped });
    });
  }

  async authorize(tenant: string, signed: SignedPayment): Promise<FinancialDecision> {
    const immutable = structuredClone(signed);
    return this.deps.store.transact(tenant, state => {
      const p = immutable.payment, l = ledgerOf(state), digest = digestOf(p);
      const reasons = this.identity(state, immutable), financial = this.financial(state, p);
      reasons.push(...financial.reasons);
      if (Object.values(l.mandates).some(m => m.payment.requestId === p.requestId)) reasons.push("REQUEST_REPLAY");
      if (reasons.length) return this.record(state, p, reasons.every(r => r === "DUAL_APPROVAL_REQUIRED") ? "REVIEW" : "DENY", reasons);
      const id = randomUUID();
      l.mandates[id] = { id, digest, payment: structuredClone(p), policyId: financial.policy.id, keyVersion: state.members[p.agentId].credentialVersion, expiresAt: Math.min(p.expiresAt, this.deps.now() + financial.policy.mandateTtlMs), createdAt: this.deps.now(), consumed: false };
      return this.record(state, p, "ALLOW", [], id);
    });
  }

  /** This is the destination-side commit, not an arbitrary provider callback. */
  async commit(tenant: string, mandateId: string, signed: SignedPayment, available = true): Promise<FinancialDecision> {
    const immutable = structuredClone(signed);
    return this.deps.store.transact(tenant, state => {
      const p = immutable.payment, l = ledgerOf(state), m = l.mandates[mandateId];
      const reasons = this.identity(state, immutable);
      reasons.push(...this.financial(state, p, mandateId).reasons);
      if (!available) reasons.push("GATEWAY_UNAVAILABLE");
      if (!m || m.consumed || m.digest !== digestOf(p) || m.expiresAt <= this.deps.now()
        || m.keyVersion !== state.members[p.agentId]?.credentialVersion) reasons.push("MANDATE_INVALID_OR_USED");
      if (l.effects.some(e => e.requestId === p.requestId)) reasons.push("IDEMPOTENCY_REPLAY");
      if (reasons.length) return this.record(state, p, "DENY", reasons);
      const effect: DestinationEffect = { id: randomUUID(), requestId: p.requestId, mandateId, digest: digestOf(p), payment: structuredClone(p), at: this.deps.now(), synthetic: true };
      m.consumed = true; l.effects.push(effect);
      return this.record(state, p, "ALLOW", [], mandateId, effect.id);
    });
  }

  // Independent destination observation, never inferred from ALLOW alone.
  async destination(tenant: string) { return this.deps.store.transact(tenant, s => structuredClone((s as State).financial?.effects ?? [])); }
  async replay(tenant: string) { return this.deps.store.transact(tenant, s => ({ events: structuredClone(s.events), valid: verifySwarmReplay(s.events, tenant), head: s.events.at(-1)?.digest ?? null, count: s.events.length })); }
  async snapshot(tenant: string) { return this.deps.store.transact(tenant, s => ({ events: structuredClone(s.events), effects: structuredClone((s as State).financial?.effects ?? []), valid: verifySwarmReplay(s.events, tenant), head: s.events.at(-1)?.digest ?? null, count: s.events.length })); }
}
