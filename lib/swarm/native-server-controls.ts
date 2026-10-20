import "server-only";
import { createServiceRoleClient } from "../supabase/service-role";
import { resolveStoredDelegatedAction, type DelegatedAuthorityContext } from "../operational-entities/delegated-authority-server";
import { verifyDestinationObservation, type EnforcementRequest, type EnforcementAdapterResult } from "../operational-entities/native-enforcement";
import { hashCanonical } from "../../src/lib/trust-core/hash";
import { SwarmContainment, swarmRequestDigest, type Classification } from "./containment";
import { createSwarmStore } from "./store";
import { swarmRpcPersistence } from "./rpc-persistence";
import { swarmNativeGuard } from "./native-guard";
import { persistSwarmReceiptProjection, recoverPersistedSwarmProjections } from "./evidence-projection-server";

/** Server-only composition: no request-supplied policy, graph, health or identity claims. */
export function createStoredSwarmControls(context: DelegatedAuthorityContext, action: Record<string, unknown>) {
  const db = createServiceRoleClient();
  const store = createSwarmStore(swarmRpcPersistence((name, args) => db.rpc(name, args)));
  const requests = new Map<string, EnforcementRequest>();
  const unavailable = async (): Promise<never> => { throw new Error("SWARM_KEY_PROVISIONING_REQUIRED"); };
  const control = new SwarmContainment({
    store, now: Date.now, heartbeatKey: unavailable,
    async authenticate() {
      if (!context.supabase || !["owner", "admin"].includes(context.role)) return null;
      const { data, error } = await context.supabase.auth.getUser();
      if (error || data?.user?.id !== context.user.id) return null;
      const workspace = await context.supabase.from("trust_workspaces").select("created_by").eq("id", context.enterpriseId).maybeSingle();
      if (workspace.error || !workspace.data) return null;
      if (workspace.data.created_by !== context.user.id) {
        const membership = await context.supabase.from("workspace_members").select("role").eq("workspace_id", context.enterpriseId).eq("user_id", context.user.id).maybeSingle();
        if (membership.error || !["owner", "admin"].includes(membership.data?.role)) return null;
      }
      return { id: context.user.id, tenantId: context.enterpriseId, kind: "human" as const, controlledBy: [], permissions: ["swarm:execute", "swarm:reconcile"], expiresAt: Date.now() + 5000 };
    },
    async resolve(request) {
      await recoverPersistedSwarmProjections(context.enterpriseId);
      if (request.enterpriseId !== context.enterpriseId || request.action.payloadDigest !== hashCanonical(action)) throw new Error("SWARM_PAYLOAD_BINDING_INVALID");
      const registry = await store.transact(context.enterpriseId, state => {
        const member = state.members[request.operationalEntityId];
        return member ? state.collectives[member.swarmId] : null;
      });
      const policy = registry?.executionPolicy;
      if (!registry || !policy?.version || !policy.evidenceRefs?.length) throw new Error("SWARM_POLICY_UNAVAILABLE");
      const current = await resolveStoredDelegatedAction(context, request.operationalEntityId, { delegationId: request.delegationId, request: action });
      const canonical = await db.from("canonical_trust_transactions").select("decision,request_digest").eq("enterprise_id", context.enterpriseId).eq("transaction_id", request.transactionId).eq("operational_entity_id", request.operationalEntityId).maybeSingle();
      if (canonical.error || !canonical.data || canonical.data.request_digest !== request.action.payloadDigest) throw new Error("SWARM_CANONICAL_BINDING_INVALID");
      // Tasks are immutable operator-provisioned policy, never caller-selected authority.
      const tasks = policy.tasks;
      if (!Array.isArray(tasks) || new Set(tasks.map(t => t.id)).size !== tasks.length || new Set(tasks.map(t => t.transactionId)).size !== tasks.length) throw new Error("SWARM_TASK_REGISTRY_INVALID");
      const task = tasks.find(t => t.transactionId === request.transactionId);
      if (!task || task.memberId !== request.operationalEntityId || task.payloadDigest !== request.action.payloadDigest) throw new Error("SWARM_TASK_BINDING_INVALID");
      const visited = new Set([task.id]);
      let parentId = task.parentTaskId;
      while (parentId !== null) {
        if (visited.has(parentId) || visited.size > 32) throw new Error("SWARM_TASK_CYCLE_OR_DEPTH");
        visited.add(parentId);
        const parent = tasks.find(t => t.id === parentId);
        if (!parent) throw new Error("SWARM_PARENT_TASK_MISSING");
        const status = await db.from("canonical_trust_transactions").select("decision,request_digest").eq("enterprise_id", context.enterpriseId).eq("transaction_id", parent.transactionId).eq("operational_entity_id", parent.memberId).maybeSingle();
        if (status.error || status.data?.decision !== "ALLOW" || status.data?.request_digest !== parent.payloadDigest) throw new Error("SWARM_PARENT_TASK_BLOCKED");
        parentId = parent.parentTaskId;
      }
      const tool = String(action.tool ?? "");
      const health = await db.from("provider_health_snapshots").select("state,observed_at,circuit_open").eq("enterprise_id", context.enterpriseId).eq("provider_key", tool).order("observed_at", { ascending: false }).limit(1).maybeSingle();
      const age = Date.now() - Date.parse(String(health.data?.observed_at));
      const providerAvailable = !health.error && ["healthy", "HEALTHY"].includes(String(health.data?.state)) && health.data?.circuit_open === false && Number.isFinite(age) && age >= 0 && age <= 60000;
      const amountMinor = Number(action.financialAmount) * 100;
      const monetary = action.financialAmount !== undefined;
      const windowMs = policy.operationQuota?.windowMs;
      if (windowMs !== undefined && (!Number.isSafeInteger(windowMs) || windowMs < 1 || policy.operationQuota?.mode !== "AGGREGATE")) throw new Error("SWARM_QUOTA_WINDOW_INVALID");
      const windowStart = windowMs ? Math.floor(Date.now() / windowMs) * windowMs : null;
      // Aggregate semantics must be explicit. A per-action financialLimit never becomes a budget.
      const parentBudget = current.contract?.contract?.swarmAuthority?.aggregateBudget;
      const declaredBudget = parentBudget ?? policy.aggregateBudget;
      if (declaredBudget && (declaredBudget.currency !== "EUR" || !Number.isSafeInteger(declaredBudget.limitMinor) || declaredBudget.limitMinor <= 0 || !Number.isSafeInteger(declaredBudget.maxParallel) || declaredBudget.maxParallel < 1)) throw new Error("SWARM_PARENT_BUDGET_INVALID");
      const aggregateBudget = declaredBudget ? {
        id: `authority:${request.authorityId}:EUR`, currency: "EUR" as const,
        limitMinor: Math.min(declaredBudget.limitMinor, policy.aggregateBudget?.limitMinor ?? declaredBudget.limitMinor),
        maxParallel: Math.min(declaredBudget.maxParallel, policy.aggregateBudget?.maxParallel ?? declaredBudget.maxParallel),
      } : null;
      const restricted = !policy.allowedTools.includes(tool) || !policy.environments.includes(request.action.environment) || !policy.resources.includes(request.action.target)
        || (monetary && (!Number.isSafeInteger(amountMinor) || amountMinor < 0))
        || (policy.perActionMinor !== undefined && (!monetary || !Number.isSafeInteger(policy.perActionMinor) || policy.perActionMinor < 0 || amountMinor > policy.perActionMinor));
      const classification: Classification = {
        ...(task.component ? { component: task.component } : {}), ...(policy.prohibitedCombinations ? { prohibitedCombinations: policy.prohibitedCombinations } : {}),
        correlationId: task.id, resource: request.action.target, operation: request.action.type,
        units: Number(action.executionCount ?? 1), limit: policy.operationQuota?.limit ?? Number.MAX_SAFE_INTEGER,
        quotaMode: policy.operationQuota?.mode ?? "PER_ACTION",
        quotaScope: request.authorityId,
        ...(windowMs && windowStart !== null ? { quotaWindow: { start: windowStart, end: windowStart + windowMs } } : {}),
        mandatoryRestriction: restricted, sensitive: ["HIGH", "CRITICAL"].includes(request.action.consequence ?? ""),
        transfer: "NONE", transferPermitted: false, policyVersion: policy.version, evidenceRefs: policy.evidenceRefs,
        ...(aggregateBudget && monetary ? { budget: { ...aggregateBudget, amountMinor } } : {}),
      };
      if (aggregateBudget && !monetary) throw new Error("SWARM_COST_CLASSIFICATION_REQUIRED");
      const decision = canonical.data.decision === "ALLOW" ? current.result.decision : canonical.data.decision === "REVIEW" ? "REVIEW" : "DENY";
      return { decision, classification, providerAvailable, policyAvailable: true,
        graph: { tenantId: context.enterpriseId, subjectId: request.operationalEntityId, workflowId: current.action.workflowId, action: current.action.type, purpose: current.action.purpose, resource: current.action.target, grants: current.result.authorityGraph.chain } };
    },
    async verifyOutcome(tenant, lease, evidence) {
      const request = requests.get(lease.id);
      if (!request) throw new Error("SWARM_OUTCOME_REQUEST_UNAVAILABLE");
      const observation = (evidence as EnforcementAdapterResult)?.destinationObservation;
      if (!observation) return { completed: false, evidenceRef: `request:${request.requestId}` };
      verifyDestinationObservation({ observation, evidenceKey: process.env.NATIVE_DESTINATION_EVIDENCE_KEY ?? "", expectedEnterpriseId: tenant, expectedEntityId: request.operationalEntityId, expectedTransactionId: request.transactionId });
      if (observation.actionDigest !== request.actionDigest || observation.idempotencyKey !== request.idempotencyKey || observation.action !== request.action.type || observation.target !== request.action.target) throw new Error("SWARM_OUTCOME_MISMATCH");
      // Conservatively commit the full authorized reservation only for a verified effect.
      // Generic provider failure is not evidence of zero spend.
      return { completed: observation.result === "OBSERVED", evidenceRef: observation.evidenceDigest, spentMinor: lease.classification.budget?.amountMinor };
    },
  });
  return {
    swarmGuard: swarmNativeGuard(control, context.enterpriseId, "current-server-session", persistSwarmReceiptProjection),
    async reconcile(request: EnforcementRequest, result: EnforcementAdapterResult | null) {
      const leaseId = swarmRequestDigest(request); requests.set(leaseId, request);
      const receipt = await control.outcome(context.enterpriseId, "current-server-session", leaseId, result);
      await persistSwarmReceiptProjection(receipt);
      return receipt;
    },
  };
}
