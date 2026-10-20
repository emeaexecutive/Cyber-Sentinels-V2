import { createHmac, timingSafeEqual } from "node:crypto";
import { evaluateAuthorityGraph, type AuthorityGraphRequest } from "../core/authority-graph.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { EnforcementRequest, TrustDecision } from "../operational-entities/native-enforcement.ts";

export type Lifecycle = "ACTIVE" | "COMPLETED" | "SUSPENDED" | "REVOKED" | "EXPIRED" | "UNREACHABLE" | "UNKNOWN";
export type Actor = { id: string; tenantId: string; kind: "human" | "agent"; permissions: string[]; expiresAt: number; controlledBy: string[]; credentialVersion?: number };
export type Member = { id: string; swarmId: string; parentId: string | null; credentialVersion: number; state: Lifecycle; heartbeatAt: number; heartbeatSequence: number; expiresAt: number };
export type Collective = { id: string; entityType: "AGENT_SWARM"; objective: string; workflowId: string; originalAuthority: string; state: Lifecycle; maxMembers: number };
export type BudgetScope = { id: string; currency: "EUR"; amountMinor: number; limitMinor: number; maxParallel: number };
export type BudgetBalance = { currency: "EUR"; limitMinor: number; maxParallel: number; reservedMinor: number; spentMinor: number };
export type Classification = { correlationId: string; resource: string; operation: string; units: number; limit: number; mandatoryRestriction: boolean; sensitive: boolean; transfer: "NONE" | "CREDENTIAL" | "SENSITIVE_DATA"; transferPermitted: boolean; policyVersion: string; evidenceRefs: string[]; component?: string; prohibitedCombinations?: string[][]; budget?: BudgetScope };
export type Lease = { id: string; memberId: string; swarmId: string; requestDigest: string; expiresAt: number; state: "READY" | "DISPATCHED" | "UNKNOWN" | "COMPLETED" | "REVOKED"; credentialVersion: number; classification: Classification; requesterId: string; authorityChain: string[]; budgetSettled?: boolean };
export type Approval = { requestDigest: string; requesterId: string; approverId: string; riskOwner: string; expiresAt: number; policyVersion: string; evidenceRefs: string[] };
export type SwarmEvent = { sequence: number; tenantId: string; kind: string; actorId: string; subjectId: string; at: number; details: Record<string, unknown>; previousHash: string; digest: string };
export type Quarantine = { kind: "agent" | "swarm" | "chain" | "workflow"; id: string; receipt: string };
export type SwarmState = { tenantId: string; collectives: Record<string, Collective>; members: Record<string, Member>; leases: Record<string, Lease>; approvals: Record<string, Approval>; quarantines: Quarantine[]; budgets?: Record<string, BudgetBalance>; events: SwarmEvent[] };
export const emptySwarmState = (tenantId: string): SwarmState => ({ tenantId, collectives: {}, members: {}, leases: {}, approvals: {}, quarantines: [], budgets: {}, events: [] });
const quarantined = (state: SwarmState, member: Member, chain: string[]) => state.quarantines.some(q => q.kind === "agent" ? q.id === member.id : q.kind === "swarm" ? q.id === member.swarmId : q.kind === "workflow" ? q.id === state.collectives[member.swarmId]?.workflowId : chain.includes(q.id));
function settleBudget(state: SwarmState, lease: Lease, spent: number) {
  const budget = lease.classification.budget;
  if (!budget) return;
  const balance = state.budgets?.[budget.id];
  if (lease.budgetSettled || !balance || !Number.isSafeInteger(spent) || spent < 0 || spent > budget.amountMinor || balance.reservedMinor < budget.amountMinor) throw new Error("SWARM_BUDGET_OUTCOME_INVALID");
  balance.reservedMinor -= budget.amountMinor; balance.spentMinor += spent; lease.budgetSettled = true;
}

/** Implementations must commit state and append-only events together, serializing concurrent writers. */
export interface SwarmStore { transact<T>(tenantId: string, change: (state: SwarmState) => T): Promise<T> }
export type SwarmDependencies = {
  store: SwarmStore;
  authenticate(proof: string): Promise<Actor | null>;
  resolve(request: EnforcementRequest): Promise<{ decision: TrustDecision; graph: AuthorityGraphRequest; classification: Classification; policyAvailable: boolean; providerAvailable: boolean }>;
  heartbeatKey(tenantId: string, memberId: string, version: number): Promise<string>;
  verifyOutcome(tenantId: string, lease: Lease, evidence: unknown): Promise<{ completed: boolean; evidenceRef: string; spentMinor?: number }>;
  now(): number;
};

export const swarmRequestDigest = (request: EnforcementRequest) => hashCanonical({ tenantId: request.enterpriseId, transactionId: request.transactionId, entityId: request.operationalEntityId, authorityId: request.authorityId, delegationId: request.delegationId, action: request.action, decisionDigest: request.decisionDigest, idempotencyKey: request.idempotencyKey });
const liveTime = (value: number, now: number) => Number.isFinite(value) && value > now;
const key = (value: string) => { if (!/^[A-Za-z0-9_.:/-]{1,240}$/.test(value) || ["__proto__", "constructor", "prototype"].includes(value)) throw new Error("SWARM_INVALID_REFERENCE"); return value; };
function event(state: SwarmState, now: number, kind: string, actorId: string, subjectId: string, details: Record<string, unknown>) {
  const body = { sequence: state.events.length + 1, tenantId: state.tenantId, kind, actorId, subjectId, at: now, details, previousHash: state.events.at(-1)?.digest ?? "0".repeat(64) };
  const receipt = { ...body, digest: hashCanonical(body) };
  state.events.push(receipt);
  return receipt;
}
export function verifySwarmReplay(events: SwarmEvent[], tenantId: string) {
  return events.every((item, index) => {
    const { digest, ...body } = item;
    return item.tenantId === tenantId && item.sequence === index + 1 && item.previousHash === (events[index - 1]?.digest ?? "0".repeat(64)) && digest === hashCanonical(body);
  });
}
export function heartbeatMac(keyValue: string, claims: { tenantId: string; memberId: string; version: number; sequence: number; at: number }) {
  if (Buffer.byteLength(keyValue) < 32) throw new Error("SWARM_HEARTBEAT_KEY_UNAVAILABLE");
  return createHmac("sha256", keyValue).update(hashCanonical(claims)).digest("hex");
}

/** An additional restrictive enforcement control, not an alternative policy decision engine. */
export class SwarmContainment {
  constructor(private readonly deps: SwarmDependencies) {}
  private async actor(tenantId: string, proof: string, permission?: string) {
    const actor = await this.deps.authenticate(proof);
    if (!actor || actor.tenantId !== tenantId || !liveTime(actor.expiresAt, this.deps.now())) throw new Error("SWARM_AUTHENTICATION_DENIED");
    if (permission && (actor.kind !== "human" || actor.controlledBy.length || !actor.permissions.includes(permission))) throw new Error("SWARM_INDEPENDENT_OPERATOR_REQUIRED");
    return actor;
  }
  async register(tenantId: string, proof: string, collective: Collective, member: Member) {
    const actor = await this.actor(tenantId, proof, "swarm:manage");
    key(collective.id); key(member.id);
    return this.deps.store.transact(tenantId, state => {
      const existing = state.collectives[collective.id];
      if (collective.entityType !== "AGENT_SWARM") throw new Error("SWARM_IDENTITY_TYPE_INVALID");
      if (state.quarantines.some(q => q.kind === "swarm" && q.id === collective.id || q.kind === "workflow" && q.id === collective.workflowId)) throw new Error("SWARM_QUARANTINED");
      if (existing && hashCanonical(existing) !== hashCanonical(collective)) throw new Error("SWARM_COLLECTIVE_IMMUTABLE");
      if (member.swarmId !== collective.id || member.state !== "ACTIVE" || collective.state !== "ACTIVE" || !collective.originalAuthority || !collective.workflowId || !collective.objective || !Number.isSafeInteger(collective.maxMembers) || collective.maxMembers < 1 || !liveTime(member.expiresAt, this.deps.now()) || !Number.isSafeInteger(member.credentialVersion) || member.credentialVersion < 1) throw new Error("SWARM_REGISTRY_INVALID");
      if (state.members[member.id]) throw new Error("SWARM_MEMBER_EXISTS");
      if (member.parentId && (!state.members[member.parentId] || state.members[member.parentId].swarmId !== collective.id)) throw new Error("SWARM_PARENT_INVALID");
      if (Object.values(state.members).filter(m => m.swarmId === collective.id).length >= collective.maxMembers) throw new Error("SWARM_RECRUITMENT_LIMIT");
      state.collectives[collective.id] = structuredClone(collective);
      state.members[member.id] = { ...structuredClone(member), heartbeatAt: 0, heartbeatSequence: 0 };
      return event(state, this.deps.now(), "MEMBERSHIP_ADDED", actor.id, member.id, { swarmId: collective.id, parentId: member.parentId, originalAuthority: collective.originalAuthority, workflowId: collective.workflowId, authorityConferred: false });
    });
  }
  async heartbeat(tenantId: string, proof: string, claims: { tenantId: string; memberId: string; version: number; sequence: number; at: number }, mac: string) {
    const actor = await this.actor(tenantId, proof);
    if (actor.kind !== "agent" || actor.id !== claims.memberId || claims.tenantId !== tenantId || actor.credentialVersion !== claims.version) throw new Error("SWARM_HEARTBEAT_IDENTITY");
    const secret = await this.deps.heartbeatKey(tenantId, actor.id, claims.version);
    const expected = heartbeatMac(secret, claims);
    if (!/^[a-f0-9]{64}$/.test(mac) || !timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(mac, "hex"))) throw new Error("SWARM_HEARTBEAT_SIGNATURE");
    return this.deps.store.transact(tenantId, state => {
      const member = state.members[actor.id]; const now = this.deps.now();
      if (!member || member.state !== "ACTIVE" || member.credentialVersion !== claims.version || !Number.isSafeInteger(claims.sequence) || claims.sequence <= member.heartbeatSequence || !Number.isFinite(claims.at) || Math.abs(now - claims.at) > 30_000 || !liveTime(member.expiresAt, now)) throw new Error("SWARM_HEARTBEAT_STALE_OR_REVOKED");
      member.heartbeatAt = claims.at; member.heartbeatSequence = claims.sequence;
      return event(state, now, "HEARTBEAT_VERIFIED", actor.id, actor.id, { sequence: claims.sequence, credentialVersion: claims.version });
    });
  }
  async approve(tenantId: string, proof: string, request: EnforcementRequest, requesterId: string, riskOwner: string, expiresAt: number, evidenceRefs: string[]) {
    const actor = await this.actor(tenantId, proof, "swarm:approve");
    if (request.enterpriseId !== tenantId || actor.id === requesterId || actor.id === request.operationalEntityId || !riskOwner || !evidenceRefs.length || !liveTime(expiresAt, this.deps.now()) || expiresAt > this.deps.now() + 300_000) throw new Error("SWARM_APPROVAL_INVALID");
    const resolved = await this.deps.resolve(request);
    if (!resolved.policyAvailable || resolved.classification.mandatoryRestriction || resolved.decision !== "ALLOW") throw new Error("SWARM_APPROVAL_CANNOT_OVERRIDE_POLICY");
    const digest = swarmRequestDigest(request);
    return this.deps.store.transact(tenantId, state => {
      const prior = state.approvals[digest];
      if (prior) throw new Error("SWARM_APPROVAL_ALREADY_EXISTS");
      const reached = new Set([actor.id]);
      let expanded = true;
      while (expanded) {
        expanded = false;
        for (const approval of Object.values(state.approvals)) if (liveTime(approval.expiresAt, this.deps.now()) && reached.has(approval.requesterId) && !reached.has(approval.approverId)) { reached.add(approval.approverId); expanded = true; }
      }
      if (reached.has(requesterId)) throw new Error("SWARM_CIRCULAR_APPROVAL");
      state.approvals[digest] = { requestDigest: digest, requesterId, approverId: actor.id, riskOwner, expiresAt, policyVersion: resolved.classification.policyVersion, evidenceRefs: [...evidenceRefs] };
      return event(state, this.deps.now(), "HUMAN_APPROVAL", actor.id, request.operationalEntityId, { requestDigest: digest, requesterId, riskOwner, expiresAt, evidenceRefs, policyVersion: resolved.classification.policyVersion });
    });
  }
  async admit(tenantId: string, proof: string, request: EnforcementRequest) {
    const actor = await this.actor(tenantId, proof);
    if (request.enterpriseId !== tenantId) throw new Error("SWARM_WRONG_TENANT");
    // Resolve current canonical decision, graph and trusted classifier outside agent input.
    let resolved: Awaited<ReturnType<SwarmDependencies["resolve"]>> | null = null;
    try { resolved = await this.deps.resolve(request); } catch { /* Unavailable verification is a denial with evidence. */ }
    return this.deps.store.transact(tenantId, state => {
      const now = this.deps.now(), member = state.members[request.operationalEntityId], reasons: string[] = [];
      const collective = member && state.collectives[member.swarmId];
      const digest = swarmRequestDigest(request);
      if (actor.kind === "agent" && actor.id !== request.operationalEntityId) reasons.push("AUTHENTICATED_AGENT_MISMATCH");
      if (actor.kind === "human" && !actor.permissions.includes("swarm:execute")) reasons.push("OPERATOR_EXECUTION_PERMISSION_REQUIRED");
      if (actor.kind === "agent" && actor.credentialVersion !== member?.credentialVersion) reasons.push("CREDENTIAL_REVOKED");
      if (!member || !collective || member.state !== "ACTIVE" || collective.state !== "ACTIVE") reasons.push("SWARM_NOT_ACTIVE");
      if (member && (!liveTime(member.expiresAt, now) || member.heartbeatAt <= 0 || now - member.heartbeatAt > 30_000 || member.heartbeatAt > now)) reasons.push("RUNTIME_UNVERIFIED");
      const classification = resolved?.classification;
      const authorityChain = resolved ? evaluateAuthorityGraph({ ...resolved.graph, evaluatedAt: new Date(now).toISOString() }).chain.flatMap(g => [g.id, g.grantorId, g.granteeId]) : [];
      if (member && quarantined(state, member, authorityChain)) reasons.push("SCOPE_QUARANTINED");
      if (!resolved || !resolved.policyAvailable || !resolved.providerAvailable) reasons.push("VERIFICATION_UNAVAILABLE");
      if (resolved && resolved.decision !== "ALLOW") reasons.push(`CANONICAL_${resolved.decision}`);
      if (resolved) {
        const graph = resolved.graph;
        if (graph.tenantId !== tenantId || graph.subjectId !== request.operationalEntityId || graph.action !== request.action.type || graph.resource !== request.action.target || graph.workflowId !== collective?.workflowId || !evaluateAuthorityGraph({ ...graph, evaluatedAt: new Date(now).toISOString() }).valid) reasons.push("AUTHORITY_INVALID");
        const root = evaluateAuthorityGraph({ ...graph, evaluatedAt: new Date(now).toISOString() }).chain[0];
        if (!root || root.id !== collective?.originalAuthority || !["human", "organization"].includes(root.grantorType)) reasons.push("ORIGINAL_AUTHORITY_MISMATCH");
      }
      if (!classification || !Number.isFinite(classification.units) || classification.units <= 0 || !Number.isFinite(classification.limit) || classification.limit < 0 || !classification.correlationId || !classification.resource || !classification.operation || !classification.policyVersion || !classification.evidenceRefs.length) reasons.push("CLASSIFICATION_UNVERIFIED");
      if (classification) {
        if (classification.mandatoryRestriction) reasons.push("MANDATORY_RESTRICTION");
        if (classification.transfer !== "NONE" && !classification.transferPermitted) reasons.push("UNAUTHORIZED_TRANSFER");
        const equivalent = (c: Classification) => c.resource === classification.resource && c.operation === classification.operation;
        const consumed = Object.values(state.leases).filter(l => equivalent(l.classification)).reduce((n, l) => n + l.classification.units, 0);
        if (consumed + classification.units > classification.limit) reasons.push("COLLECTIVE_LIMIT_EXCEEDED");
        const components = new Set(Object.values(state.leases).filter(l => l.classification.resource === classification.resource).map(l => l.classification.component));
        components.add(classification.component);
        if (classification.prohibitedCombinations?.some(rule => rule.length > 0 && rule.every(part => components.has(part)))) reasons.push("DISTRIBUTED_PROHIBITED_ACTION");
        if (state.events.some(e => e.kind === "EXECUTION_DENIED" && e.subjectId !== request.operationalEntityId && e.details.resource === classification.resource && e.details.operation === classification.operation)) reasons.push("DENIED_EQUIVALENT_PEER_REQUEST");
        if (classification.sensitive) {
          const approval = state.approvals[digest];
          if (!approval || approval.requesterId !== actor.id || approval.approverId === actor.id || approval.approverId === request.operationalEntityId || approval.policyVersion !== classification.policyVersion || !liveTime(approval.expiresAt, now)) reasons.push("INDEPENDENT_APPROVAL_REQUIRED");
        }
      }
      if (state.leases[digest]) reasons.push("SWARM_LEASE_REPLAY");
      const budget = classification?.budget;
      if (budget) {
        key(budget.id);
        if (budget.currency !== "EUR" || !Number.isSafeInteger(budget.amountMinor) || budget.amountMinor <= 0 || !Number.isSafeInteger(budget.limitMinor) || budget.limitMinor <= 0 || !Number.isSafeInteger(budget.maxParallel) || budget.maxParallel < 1) reasons.push("BUDGET_SCOPE_INVALID");
        const balance = state.budgets?.[budget.id];
        if (balance && (balance.currency !== budget.currency || balance.limitMinor !== budget.limitMinor || balance.maxParallel !== budget.maxParallel)) reasons.push("BUDGET_SCOPE_IMMUTABLE");
        const used = (balance?.reservedMinor ?? 0) + (balance?.spentMinor ?? 0);
        if (budget.amountMinor > budget.limitMinor - used) reasons.push("SHARED_BUDGET_EXCEEDED");
        const concurrent = Object.values(state.leases).filter(l => l.classification.budget?.id === budget.id && ["READY", "DISPATCHED", "UNKNOWN"].includes(l.state)).length;
        if (concurrent >= budget.maxParallel) reasons.push("PARALLEL_EXECUTION_LIMIT");
      }
      if (reasons.length || !classification || !member) {
        const receipt = event(state, now, "EXECUTION_DENIED", actor.id, request.operationalEntityId, { requestDigest: digest, decision: "DENY", reasons, resource: classification?.resource ?? null, operation: classification?.operation ?? null, correlationId: classification?.correlationId ?? null, evidenceRefs: classification?.evidenceRefs ?? [] });
        return { allowed: false as const, reasons, receipt, leaseId: null };
      }
      state.leases[digest] = { id: digest, memberId: member.id, swarmId: member.swarmId, requestDigest: digest, expiresAt: Math.min(now + 15_000, member.expiresAt), state: "READY", credentialVersion: member.credentialVersion, classification: structuredClone(classification), requesterId: actor.id, authorityChain };
      if (budget) {
        state.budgets ??= {};
        const balance = state.budgets[budget.id] ??= { currency: budget.currency, limitMinor: budget.limitMinor, maxParallel: budget.maxParallel, reservedMinor: 0, spentMinor: 0 };
        balance.reservedMinor += budget.amountMinor;
      }
      return { allowed: true as const, reasons: [], leaseId: digest, receipt: event(state, now, "LEASE_RESERVED", actor.id, member.id, { requestDigest: digest, swarmId: member.swarmId, classification, authorityId: request.authorityId, delegationId: request.delegationId, transactionId: request.transactionId }) };
    });
  }
  async dispatch(tenantId: string, proof: string, request: EnforcementRequest, leaseId: string) {
    const actor = await this.actor(tenantId, proof);
    let resolved: Awaited<ReturnType<SwarmDependencies["resolve"]>> | null = null;
    try { resolved = await this.deps.resolve(request); } catch { /* Fail closed. */ }
    return this.deps.store.transact(tenantId, state => {
      const lease = state.leases[leaseId], member = lease && state.members[lease.memberId]; const now = this.deps.now();
      const valid = lease && member && lease.requesterId === actor.id && lease.requestDigest === swarmRequestDigest(request) && request.enterpriseId === tenantId && lease.state === "READY" && liveTime(lease.expiresAt, now) && member.state === "ACTIVE" && state.collectives[member.swarmId]?.state === "ACTIVE" && member.credentialVersion === lease.credentialVersion && liveTime(member.expiresAt, now) && now - member.heartbeatAt <= 30_000 && resolved?.decision === "ALLOW" && resolved.policyAvailable && resolved.providerAvailable && !resolved.classification.mandatoryRestriction && hashCanonical(resolved.classification) === hashCanonical(lease.classification) && evaluateAuthorityGraph({ ...resolved.graph, evaluatedAt: new Date(now).toISOString() }).valid;
      const approval = state.approvals[swarmRequestDigest(request)];
      const approvalValid = !lease?.classification.sensitive || (approval && approval.requesterId === actor.id && approval.approverId !== actor.id && liveTime(approval.expiresAt, now));
      const graph = resolved?.graph;
      const root = graph && evaluateAuthorityGraph({ ...graph, evaluatedAt: new Date(now).toISOString() }).chain[0];
      const bindingValid = graph && member && graph.tenantId === tenantId && graph.subjectId === member.id && graph.action === request.action.type && graph.resource === request.action.target && graph.workflowId === state.collectives[member.swarmId]?.workflowId && root?.id === state.collectives[member.swarmId]?.originalAuthority && ["human", "organization"].includes(root?.grantorType ?? "");
      if (!valid || !bindingValid || !approvalValid || quarantined(state, member, lease.authorityChain) || (actor.kind === "agent" && actor.credentialVersion !== member?.credentialVersion)) return { allowed: false, receipt: event(state, now, "DISPATCH_DENIED", actor.id, request.operationalEntityId, { leaseId, decision: "DENY" }) };
      lease.state = "DISPATCHED";
      return { allowed: true, receipt: event(state, now, "DISPATCH_STARTED", actor.id, member.id, { leaseId, transactionId: request.transactionId, externalCancellationGuaranteed: false }) };
    });
  }
  async contain(tenantId: string, proof: string, scope: { kind: "agent" | "swarm" | "chain" | "workflow"; id: string }, reason: string) {
    const actor = await this.actor(tenantId, proof, "swarm:contain");
    if (!reason.trim()) throw new Error("SWARM_REASON_REQUIRED");
    return this.deps.store.transact(tenantId, state => {
      const ids = new Set(Object.values(state.members).filter(m => scope.kind === "agent" || scope.kind === "chain" ? m.id === scope.id : scope.kind === "swarm" ? m.swarmId === scope.id : state.collectives[m.swarmId]?.workflowId === scope.id).map(m => m.id));
      if (scope.kind === "chain") for (const lease of Object.values(state.leases)) if (lease.authorityChain.includes(scope.id)) ids.add(lease.memberId);
      if (scope.kind === "chain") { let changed = true; while (changed) { changed = false; for (const m of Object.values(state.members)) if (m.parentId && ids.has(m.parentId) && !ids.has(m.id)) { ids.add(m.id); changed = true; } } }
      if (!ids.size) throw new Error("SWARM_SCOPE_NOT_FOUND");
      const inFlight: string[] = [];
      for (const id of ids) { state.members[id].state = "SUSPENDED"; state.members[id].credentialVersion++; state.members[id].heartbeatAt = 0; }
      for (const lease of Object.values(state.leases)) if (ids.has(lease.memberId)) { if (lease.state === "DISPATCHED" || lease.state === "UNKNOWN") { inFlight.push(lease.id); lease.state = "UNKNOWN"; } else if (lease.state === "READY") { settleBudget(state, lease, 0); lease.state = "REVOKED"; } }
      const receipt = event(state, this.deps.now(), "EMERGENCY_CONTAINMENT", actor.id, scope.id, { scope, reason, affected: [...ids], inFlight, credentialsInvalidatedAtGateway: true, externalCredentialsRotated: false, restorationRequiresIndependentApproval: true });
      state.quarantines.push({ ...scope, receipt: receipt.digest });
      return receipt;
    });
  }
  async restore(tenantId: string, proof: string, memberId: string, containmentReceipt: string) {
    const actor = await this.actor(tenantId, proof, "swarm:restore");
    return this.deps.store.transact(tenantId, state => {
      const containment = state.events.find(e => e.digest === containmentReceipt && e.kind === "EMERGENCY_CONTAINMENT");
      const member = state.members[memberId];
      if (!containment || containment.actorId === actor.id || !(containment.details.affected as string[]).includes(memberId) || member?.state !== "SUSPENDED" || Object.values(state.leases).some(l => l.memberId === memberId && ["UNKNOWN", "DISPATCHED"].includes(l.state))) throw new Error("SWARM_RESTORATION_DENIED");
      member.state = "ACTIVE"; member.credentialVersion++; member.heartbeatAt = 0;
      state.quarantines = state.quarantines.filter(q => !(q.kind === "agent" && q.id === memberId && q.receipt === containmentReceipt));
      return event(state, this.deps.now(), "AUTHORITY_RESTORATION_REVIEWED", actor.id, memberId, { containmentReceipt, newCredentialVersion: member.credentialVersion, freshHeartbeatAndLeaseRequired: true });
    });
  }
  async restoreScope(tenantId: string, proof: string, containmentReceipt: string) {
    const actor = await this.actor(tenantId, proof, "swarm:restore");
    return this.deps.store.transact(tenantId, state => {
      const receipt = state.events.find(e => e.digest === containmentReceipt && e.kind === "EMERGENCY_CONTAINMENT");
      if (!receipt || receipt.actorId === actor.id || !state.quarantines.some(q => q.receipt === containmentReceipt)) throw new Error("SWARM_RESTORATION_DENIED");
      const affected = receipt.details.affected as string[];
      if (Object.values(state.leases).some(l => affected.includes(l.memberId) && ["DISPATCHED", "UNKNOWN"].includes(l.state))) throw new Error("SWARM_RECONCILIATION_REQUIRED");
      state.quarantines = state.quarantines.filter(q => q.receipt !== containmentReceipt);
      return event(state, this.deps.now(), "SCOPE_RESTORATION_REVIEWED", actor.id, receipt.subjectId, { containmentReceipt, membersRemainSuspended: true });
    });
  }
  async reconcile(tenantId: string, proof: string) {
    const actor = await this.actor(tenantId, proof, "swarm:contain");
    return this.deps.store.transact(tenantId, state => {
      const now = this.deps.now(); const alerts: string[] = [];
      for (const member of Object.values(state.members)) {
        if (member.state === "ACTIVE" && (!liveTime(member.expiresAt, now) || now - member.heartbeatAt > 30_000)) {
          member.state = liveTime(member.expiresAt, now) ? "UNREACHABLE" : "EXPIRED"; member.credentialVersion++; alerts.push(member.id);
          for (const lease of Object.values(state.leases).filter(l => l.memberId === member.id)) { if (lease.state === "DISPATCHED") lease.state = "UNKNOWN"; if (lease.state === "READY") { settleBudget(state, lease, 0); lease.state = "REVOKED"; } }
        }
      }
      const expiredReservations: string[] = [];
      for (const lease of Object.values(state.leases)) if (lease.state === "READY" && !liveTime(lease.expiresAt, now)) { settleBudget(state, lease, 0); lease.state = "REVOKED"; expiredReservations.push(lease.id); }
      return event(state, now, "TRANSACTIONS_RECONCILED", actor.id, tenantId, { unexpectedTerminationAlerts: alerts, expiredUndispatchedReservations: expiredReservations, unresolved: Object.values(state.leases).filter(l => l.state === "UNKNOWN").map(l => l.id), automaticRetry: false });
    });
  }
  async outcome(tenantId: string, proof: string, leaseId: string, evidence: unknown) {
    const actor = await this.actor(tenantId, proof, "swarm:reconcile");
    const lease = await this.deps.store.transact(tenantId, state => structuredClone(state.leases[leaseId] ?? null));
    if (!lease || !["DISPATCHED", "UNKNOWN"].includes(lease.state)) throw new Error("SWARM_OUTCOME_STATE_INVALID");
    const verified = await this.deps.verifyOutcome(tenantId, lease, evidence);
    if (!verified.evidenceRef) throw new Error("SWARM_OUTCOME_UNVERIFIED");
    return this.deps.store.transact(tenantId, state => {
      const current = state.leases[leaseId];
      if (!current || !["DISPATCHED", "UNKNOWN"].includes(current.state)) throw new Error("SWARM_OUTCOME_CONFLICT");
      const budget = current.classification.budget;
      if (budget && verified.completed) settleBudget(state, current, verified.spentMinor ?? budget.amountMinor);
      current.state = verified.completed ? "COMPLETED" : "UNKNOWN";
      return event(state, this.deps.now(), "DESTINATION_RECONCILED", actor.id, lease.memberId, { leaseId, outcome: current.state, evidenceRef: verified.evidenceRef, spentMinor: verified.completed ? verified.spentMinor ?? budget?.amountMinor ?? null : null, budgetReleased: Boolean(budget && verified.completed) });
    });
  }
  async changeMembership(tenantId: string, proof: string, memberId: string, stateValue: "REVOKED" | "COMPLETED") {
    const actor = await this.actor(tenantId, proof, "swarm:manage");
    return this.deps.store.transact(tenantId, state => {
      const member = state.members[memberId];
      if (!member) throw new Error("SWARM_MEMBER_NOT_FOUND");
      const unresolved = Object.values(state.leases).filter(l => l.memberId === memberId && l.state !== "COMPLETED" && l.state !== "REVOKED");
      if (stateValue === "COMPLETED" && (unresolved.length || member.state !== "ACTIVE" || !state.events.some(e => e.subjectId === memberId && e.kind === "DESTINATION_RECONCILED" && e.details.outcome === "COMPLETED"))) throw new Error("SWARM_COMPLETION_UNVERIFIED");
      member.state = stateValue; member.credentialVersion++; member.heartbeatAt = 0;
      for (const lease of unresolved) { if (lease.state === "READY") { settleBudget(state, lease, 0); lease.state = "REVOKED"; } else lease.state = "UNKNOWN"; }
      return event(state, this.deps.now(), "MEMBERSHIP_CHANGED", actor.id, memberId, { state: stateValue, unresolved: unresolved.map(l => l.id), authorityConferred: false });
    });
  }
  async evidence(tenantId: string, proof: string) {
    await this.actor(tenantId, proof, "swarm:audit");
    return this.deps.store.transact(tenantId, state => { if (!verifySwarmReplay(state.events, tenantId)) throw new Error("SWARM_REPLAY_INTEGRITY"); return structuredClone(state.events); });
  }
}
