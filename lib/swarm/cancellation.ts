import { createHmac, sign, verify, timingSafeEqual, type KeyLike } from "node:crypto";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import { appendSwarmEvent, swarmRequestDigest, type Actor, type SwarmEvent, type SwarmState, type SwarmStore } from "./containment.ts";
import type { ContainmentKey } from "./prevention-kit.ts";
import type { EnforcementRequest } from "../operational-entities/native-enforcement.ts";

export type CancellationStatus = "CANCEL_REQUESTED" | "CANCEL_ACKNOWLEDGED" | "CANCELLED" | "ALREADY_COMPLETED" | "CANCELLATION_UNCONFIRMED";
export type CancellationCommand = { domain: "tenente:cancellation:v1"; tenantId: string; swarmId: string; taskId: string; executionId: string; reason: string; issuer: string; keyId: string; nonce: string; issuedAt: number; expiresAt: number; correlationId: string };
export type SignedCancellation = { command: CancellationCommand; signature: string };
export function signCancellation(command: CancellationCommand, key: KeyLike): SignedCancellation {
  return { command, signature: sign(null, Buffer.from(hashCanonical(command)), key).toString("base64url") };
}
export function verifyCancellation(input: SignedCancellation, key: ContainmentKey, tenant: string, now: number) {
  const c = input?.command;
  if (!c || c.domain !== "tenente:cancellation:v1" || c.tenantId !== tenant || key.tenantId !== tenant || key.issuerId !== c.issuer || key.revoked || !Number.isFinite(key.expiresAt) || key.expiresAt <= now || !key.swarmIds.includes(c.swarmId)
    || ![c.swarmId, c.taskId, c.executionId, c.issuer, c.keyId, c.correlationId].every(x => typeof x === "string" && /^[A-Za-z0-9_.:/-]{1,240}$/.test(x))
    || !/^[A-Za-z0-9_.:-]{16,160}$/.test(c.nonce) || typeof c.reason !== "string" || !c.reason.trim() || c.reason.length > 1000
    || !Number.isSafeInteger(c.issuedAt) || !Number.isSafeInteger(c.expiresAt) || c.issuedAt > now || c.expiresAt <= now || c.expiresAt <= c.issuedAt || c.expiresAt - c.issuedAt > 60000
    || !/^[A-Za-z0-9_-]{86}$/.test(input.signature) || !verify(null, Buffer.from(hashCanonical(c)), key.publicKey, Buffer.from(input.signature, "base64url"))) throw new Error("CANCELLATION_COMMAND_REJECTED");
  return c;
}
function evidenceMac(details: Record<string, unknown>, key: string) {
  if (Buffer.byteLength(key) < 32) throw new Error("CANCELLATION_RUNTIME_KEY_UNAVAILABLE");
  return createHmac("sha256", key).update("tenente:cancellation-evidence:v1\n").update(hashCanonical(details)).digest("hex");
}
function signedEvent(state: SwarmState, at: number, actorId: string, subjectId: string, details: Record<string, unknown>, key: string) {
  const body = { sequence: state.events.length + 1, tenantId: state.tenantId, kind: "TRANSACTIONS_RECONCILED", actorId, subjectId, at, details, previousHash: state.events.at(-1)?.digest ?? "0".repeat(64) };
  return appendSwarmEvent(state, at, body.kind, actorId, subjectId, { ...details, runtimeSignature: evidenceMac(body, key) });
}
export function verifyCancellationEvidence(event: SwarmEvent, key: string) {
  const { runtimeSignature, ...details } = event.details;
  const { digest, ...body } = event;
  return digest === hashCanonical(body) && typeof runtimeSignature === "string" && /^[a-f0-9]{64}$/.test(runtimeSignature)
    && timingSafeEqual(Buffer.from(runtimeSignature, "hex"), Buffer.from(evidenceMac({ ...body, details }, key), "hex"));
}
const commandOf = (event: SwarmEvent) => event.details.command as CancellationCommand | undefined;
export type CancellationDependencies = {
  store: SwarmStore; now(): number; authenticate(): Promise<Actor | null>;
  key(tenant: string, keyId: string): Promise<ContainmentKey>; runtimeKey(): string;
  project?(event: SwarmEvent): Promise<void>;
};
/** Durable first-party cancellation. No caller-supplied transport URL or acknowledgement. */
export function cancellationRuntime(deps: CancellationDependencies) {
  async function authorized(tenant: string) {
    const a = await deps.authenticate();
    if (!a || a.tenantId !== tenant || a.kind !== "human" || a.controlledBy.length || !a.permissions.includes("swarm:contain") || a.expiresAt <= deps.now()) throw new Error("CANCELLATION_OPERATOR_DENIED");
    return a;
  }
  async function record(input: SignedCancellation, status: CancellationStatus, proof: string, actorId = "controlled-runtime") {
    const c = input.command, runtimeKey = deps.runtimeKey();
    const receipt = await deps.store.transact(c.tenantId, state => {
      const original = state.events.find(e => e.details.cancellationStatus === "CANCEL_REQUESTED" && commandOf(e)?.nonce === c.nonce && commandOf(e)?.issuer === c.issuer);
      if (!original || hashCanonical(commandOf(original)!) !== hashCanonical(c) || original.details.commandSignature !== input.signature) throw new Error("CANCELLATION_NOT_REQUESTED");
      const previous = state.events.filter(e => commandOf(e)?.nonce === c.nonce && commandOf(e)?.issuer === c.issuer).at(-1)!;
      if (["CANCELLED", "ALREADY_COMPLETED"].includes(String(previous.details.cancellationStatus))) return previous;
      if (state.events.some(e => commandOf(e)?.nonce === c.nonce && commandOf(e)?.issuer === c.issuer && e.details.cancellationStatus === status && e.details.proof === proof)) return previous;
      const lease = state.leases[c.executionId];
      const details = { cancellationStatus: status, command: c, commandSignature: input.signature, proof, runtimeId: "cyber-sentinels-controlled-runtime", externalRollbackClaimed: false };
      return signedEvent(state, deps.now(), actorId, lease.memberId, details, runtimeKey);
    });
    await deps.project?.(receipt); return receipt;
  }
  async function request(tenant: string, input: SignedCancellation) {
    const actor = await authorized(tenant);
    if (!input?.command) throw new Error("CANCELLATION_COMMAND_REJECTED");
    const c = verifyCancellation(input, await deps.key(tenant, input.command.keyId), tenant, deps.now());
    if (c.issuer !== actor.id) throw new Error("CANCELLATION_ISSUER_DENIED");
    const runtimeKey = deps.runtimeKey();
    const result = await deps.store.transact(tenant, state => {
      const prior = state.events.filter(e => commandOf(e)?.issuer === c.issuer && commandOf(e)?.nonce === c.nonce);
      if (prior.length) {
        if (hashCanonical(commandOf(prior[0])!) !== hashCanonical(c) || prior[0].details.commandSignature !== input.signature) throw new Error("CANCELLATION_NONCE_REPLAY");
        return { receipt: prior.at(-1)!, outcome: ["CANCEL_REQUESTED", "CANCEL_ACKNOWLEDGED"].includes(String(prior.at(-1)!.details.cancellationStatus)) ? prior[0].details.before === "READY" ? "CANCELLED" : prior[0].details.before === "COMPLETED" ? "ALREADY_COMPLETED" : null : null };
      }
      const lease = state.leases[c.executionId];
      if (!lease || lease.swarmId !== c.swarmId || lease.classification.correlationId !== c.taskId || c.expiresAt <= deps.now()) throw new Error("CANCELLATION_TARGET_DENIED");
      const before = lease.state;
      if (before === "READY") {
        const budget = lease.classification.budget;
        if (budget && !lease.budgetSettled) { const balance = state.budgets?.[budget.id]; if (!balance || balance.reservedMinor < budget.amountMinor) throw new Error("CANCELLATION_BUDGET_INVALID"); balance.reservedMinor -= budget.amountMinor; lease.budgetSettled = true; }
        lease.state = "REVOKED";
      }
      const details = { cancellationStatus: "CANCEL_REQUESTED", command: c, commandSignature: input.signature, before, runtimeId: "cyber-sentinels-controlled-runtime", externalRollbackClaimed: false };
      const receipt = signedEvent(state, deps.now(), actor.id, lease.memberId, details, runtimeKey);
      return { receipt, outcome: before === "READY" ? "CANCELLED" : before === "COMPLETED" ? "ALREADY_COMPLETED" : null };
    });
    await deps.project?.(result.receipt);
    if (result.outcome) {
      await record(input, "CANCEL_ACKNOWLEDGED", "durable-control-plane-received");
      return record(input, result.outcome as CancellationStatus, result.outcome === "CANCELLED" ? "atomic-READY-to-REVOKED-before-dispatch" : "verified-completed-lease");
    }
    return result.receipt;
  }
  async function reconcile(tenant: string, input: SignedCancellation) {
    const actor = await authorized(tenant);
    if (input.command.tenantId !== tenant) throw new Error("CANCELLATION_TARGET_DENIED");
    const snapshot = await deps.store.transact(tenant, s => ({ lease: s.leases[input.command.executionId], original: s.events.find(e => e.details.cancellationStatus === "CANCEL_REQUESTED" && commandOf(e)?.nonce === input.command.nonce && commandOf(e)?.issuer === input.command.issuer) }));
    if (snapshot.lease?.state === "REVOKED" && snapshot.original?.details.before === "READY") {
      await record(input, "CANCEL_ACKNOWLEDGED", "recovered-durable-queued-cancellation", actor.id);
      return record(input, "CANCELLED", "atomic-READY-to-REVOKED-before-dispatch", actor.id);
    }
    return record(input, snapshot.lease?.state === "COMPLETED" ? "ALREADY_COMPLETED" : "CANCELLATION_UNCONFIRMED", snapshot.lease?.state === "COMPLETED" ? "verified-completed-lease" : "no-verified-zero-effect-outcome", actor.id);
  }
  async function deliver(tenant: string, input: SignedCancellation) {
    let receipt = await request(tenant, input);
    for (let attempt = 0; attempt < 3 && !["CANCELLED", "ALREADY_COMPLETED", "CANCELLATION_UNCONFIRMED"].includes(String(receipt.details.cancellationStatus)); attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      receipt = await deps.store.transact(tenant, s => s.events.filter(e => commandOf(e)?.nonce === input.command.nonce && commandOf(e)?.issuer === input.command.issuer).at(-1)!);
    }
    if (["CANCEL_REQUESTED", "CANCEL_ACKNOWLEDGED"].includes(String(receipt.details.cancellationStatus))) return record(input, "CANCELLATION_UNCONFIRMED", "bounded-delivery-window-exhausted");
    return receipt;
  }
  async function open(request: EnforcementRequest) {
    const controller = new AbortController(), tenant = request.enterpriseId, execution = swarmRequestDigest(request);
    let closed = false, checking: Promise<void> | null = null;
    async function inspect() {
      const snapshot = await deps.store.transact(tenant, s => ({ lease: s.leases[execution], member: s.members[request.operationalEntityId], command: s.events.find(e => e.details.cancellationStatus === "CANCEL_REQUESTED" && commandOf(e)?.executionId === execution) }));
      if (snapshot.command) {
        const input = { command: commandOf(snapshot.command)!, signature: snapshot.command.details.commandSignature as string };
        verifyCancellation(input, await deps.key(tenant, input.command.keyId), tenant, deps.now());
        await record(input, "CANCEL_ACKNOWLEDGED", "authenticated-controlled-transport-received");
        controller.abort();
        await record(input, "CANCELLATION_UNCONFIRMED", "transport-abort-does-not-prove-provider-rollback");
      }
      if (!snapshot.lease || snapshot.lease.state !== "DISPATCHED" || snapshot.member?.state !== "ACTIVE" || snapshot.member.expiresAt <= deps.now() || snapshot.lease.expiresAt <= deps.now() || deps.now() - snapshot.member.heartbeatAt > 30000 || snapshot.member.credentialVersion !== snapshot.lease.credentialVersion) {
        controller.abort();
        if (snapshot.lease && !snapshot.command) {
          const runtimeKey = deps.runtimeKey();
          const receipt = await deps.store.transact(tenant, state => {
            const prior = state.events.find(e => e.details.runtimeAbort === execution);
            if (prior) return prior;
            const details = { cancellationStatus: "CANCELLATION_UNCONFIRMED", runtimeAbort: execution, tenantId: tenant, swarmId: snapshot.lease.swarmId, taskId: snapshot.lease.classification.correlationId, proof: "authority-or-runtime-no-longer-current", externalRollbackClaimed: false };
            return signedEvent(state, deps.now(), "controlled-runtime", request.operationalEntityId, details, runtimeKey);
          });
          await deps.project?.(receipt);
        }
      }
    }
    async function check() { if (controller.signal.aborted) return; try { await inspect(); } catch { controller.abort(); } }
    await check();
    const timer = setInterval(() => { if (!closed && !checking) checking = check().finally(() => { checking = null; }); }, 100);
    return { signal: controller.signal, async close() { closed = true; clearInterval(timer); await checking; } };
  }
  return { request, deliver, reconcile, open };
}

/** Third-party implementations must supply a documented authenticated contract and integration proof. */
export interface ThirdPartyCancellationAdapter {
  readonly supported: boolean;
  cancel(input: SignedCancellation): Promise<{ status: CancellationStatus; reason: string; signedEvidence: SwarmEvent | null }>;
}
export const unsupportedCancellation: ThirdPartyCancellationAdapter = { supported: false, async cancel() { return { status: "CANCELLATION_UNCONFIRMED", reason: "UNSUPPORTED", signedEvidence: null }; } };
