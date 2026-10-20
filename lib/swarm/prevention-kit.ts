import { sign, verify, type KeyLike } from "node:crypto";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";
import type { SwarmEvent } from "./containment.ts";

export const containmentLevels = ["OBSERVE", "REVIEW", "DENY", "QUARANTINE", "REVOKE", "EMERGENCY_STOP"] as const;
export type ContainmentCommand = { version: 1; tenantId: string; swarmId: string; issuerId: string; keyId: string; nonce: string; issuedAt: number; expiresAt: number; level: typeof containmentLevels[number]; target: { kind: "agent" | "swarm" | "chain" | "workflow"; id: string }; reason: string };
export type SignedContainmentCommand = { command: ContainmentCommand; signature: string };
export type ContainmentKey = { publicKey: KeyLike; issuerId: string; tenantId: string; swarmIds: string[]; expiresAt: number; revoked: boolean };
export function signContainmentCommand(command: ContainmentCommand, privateKey: KeyLike): SignedContainmentCommand {
  return { command, signature: sign(null, Buffer.from(hashCanonical(command)), privateKey).toString("base64url") };
}
/** Only a pinned, currently authorized key resolver may supply this trust anchor. */
export function verifyContainmentCommand(input: SignedContainmentCommand, key: ContainmentKey, tenantId: string, now: number) {
  const c = input?.command;
  if (!c || c.version !== 1 || c.tenantId !== tenantId || key.tenantId !== tenantId || c.issuerId !== key.issuerId || key.revoked || !Number.isFinite(key.expiresAt) || key.expiresAt <= now || !key.swarmIds.includes(c.swarmId)
    || !containmentLevels.includes(c.level) || !["agent", "swarm", "chain", "workflow"].includes(c.target?.kind)
    || !/^[A-Za-z0-9_.:-]{16,160}$/.test(c.nonce) || !c.target.id || !c.reason?.trim() || c.reason.length > 1000
    || !Number.isSafeInteger(c.issuedAt) || !Number.isSafeInteger(c.expiresAt) || c.issuedAt > now || c.expiresAt <= now || c.expiresAt - c.issuedAt > 60000 || c.expiresAt <= c.issuedAt
    || !/^[A-Za-z0-9_-]{86}$/.test(input.signature) || !verify(null, Buffer.from(hashCanonical(c)), key.publicKey, Buffer.from(input.signature, "base64url"))) throw new Error("SWARM_COMMAND_REJECTED");
  return c;
}
/** Detection informs the existing control plane; it does not manufacture an ALLOW. */
export function detectSwarmAnomalies(events: SwarmEvent[]) {
  const denied = events.filter(e => e.kind === "EXECUTION_DENIED");
  const groups = new Map<string, SwarmEvent[]>();
  for (const e of denied) {
    const id = `${e.tenantId}:${String(e.details.correlationId ?? e.subjectId)}`;
    groups.set(id, [...(groups.get(id) ?? []), e]);
  }
  return [...groups.values()].filter(es => es.length >= 3).map(es => ({ tenantId: es[0].tenantId, recommendedLevel: new Set(es.map(e => e.subjectId)).size > 1 ? "QUARANTINE" : "REVIEW", evidence: es.map(e => e.digest), authorityConferred: false }));
}

export type CancellationResult = { runtimeId: string; status: "REQUESTED" | "PARTIAL" | "UNSUPPORTED" | "DELIVERY_UNKNOWN"; evidenceRef: string | null };
/** Runtime adapters are operator-integrated dependencies, never arbitrary request URLs.
 * A delivery acknowledgement is not proof that an external process has stopped. */
export async function deliverContainment(input: SignedContainmentCommand, runtimes: { id: string; send(command: SignedContainmentCommand): Promise<{ status: "REQUESTED" | "PARTIAL" | "UNSUPPORTED"; evidenceRef?: string }> }[]) {
  return Promise.all(runtimes.map(async (runtime: typeof runtimes[number]): Promise<CancellationResult> => {
    try { const result = await runtime.send(input);
      if (!["REQUESTED", "PARTIAL", "UNSUPPORTED"].includes(result.status)) throw new Error("INVALID_CANCELLATION_ACK");
      return { runtimeId: runtime.id, status: result.status, evidenceRef: result.evidenceRef ?? null };
    } catch { return { runtimeId: runtime.id, status: "DELIVERY_UNKNOWN", evidenceRef: null }; }
  }));
}
