/** Browser-only fictional teaching model. NOT the production gateway or a hosted quota service. */
export const loopPolicy = Object.freeze({ version: "illustrative-loop-v1", quotaScope: "fictional:river-crossing", maxAttempts: 3, allowedRetries: 2, estimatedCostMicrosPerAttempt: 1000, estimatedSpendCapMicros: 3000 });
export type LoopEvent = { sequence: number; kind: string; details: Record<string, string | number | boolean>; previousHash: string; synthetic: true; digest: string };
export type LoopSnapshot = { used: number; stopped: boolean; handedOff: boolean; unknown: string[]; observed: number | null; estimatedCostMicros: number; events: LoopEvent[]; policy: typeof loopPolicy };
type Decision = { decision: "ALLOW" | "DENY"; reason: string; requestId: string };
async function hash(value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}
export async function verifyLoopReplay(events: LoopEvent[]) {
  let previous = "0".repeat(64);
  for (let index = 0; index < events.length; index++) {
    const { digest, ...body } = events[index];
    if (body.sequence !== index + 1 || body.previousHash !== previous || await hash(body) !== digest) return false;
    previous = digest;
  }
  return true;
}

export class LoopSimulation {
  private used = 0;
  private stopped = false;
  private handedOff = false;
  private observed: number | null = null;
  private events: LoopEvent[] = [];
  private unknown = new Set<string>();
  private decisions = new Map<string, Decision>();
  // Destination ledger is separate from decision receipts. Only observe/reconcile reads it.
  private destination = new Map<string, number>();
  private queue: Promise<unknown> = Promise.resolve();
  private serial<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.then(work);
    this.queue = result.catch(() => undefined);
    return result;
  }
  private async append(kind: string, details: LoopEvent["details"]) {
    const body = { sequence: this.events.length + 1, kind, details, previousHash: this.events.at(-1)?.digest ?? "0".repeat(64), synthetic: true as const };
    const event = { ...body, digest: await hash(body) };
    this.events.push(event);
    return event;
  }
  snapshot(): LoopSnapshot {
    return { used: this.used, stopped: this.stopped, handedOff: this.handedOff, unknown: [...this.unknown], observed: this.observed, estimatedCostMicros: this.used * loopPolicy.estimatedCostMicrosPerAttempt, events: structuredClone(this.events), policy: loopPolicy };
  }
  async attempt(agent: "agent-1" | "agent-2", requestId: string, behavior: "FAIL" | "COMPLETE" | "TIMEOUT" = "FAIL") {
    return this.serial(async () => {
      const prior = this.decisions.get(requestId);
      if (prior) { await this.append("IDEMPOTENT_REPLAY", { agent, requestId, decision: prior.decision, newEffect: false }); return prior; }
      const reason = this.stopped ? "EMERGENCY_STOP_EFFECTIVE" : this.used >= loopPolicy.maxAttempts ? "COLLECTIVE_LIMIT_EXCEEDED" : this.unknown.size ? "RECONCILIATION_REQUIRED" : "TRUSTED_SHARED_SCOPE_RESERVED";
      const decision: Decision = { decision: reason === "TRUSTED_SHARED_SCOPE_RESERVED" ? "ALLOW" : "DENY", reason, requestId };
      if (decision.decision === "ALLOW") this.used++;
      this.decisions.set(requestId, decision);
      await this.append("DECISION", { agent, ...decision, quotaScope: loopPolicy.quotaScope, policyVersion: loopPolicy.version, consumed: this.used });
      if (decision.decision === "DENY") {
        const effects = this.destination.get(requestId) ?? 0;
        await this.append("DESTINATION_OBSERVATION", { agent, requestId, effects, source: "separate-browser-ledger", deniedRequest: true });
        return decision;
      }
      if (behavior === "FAIL") {
        await this.append("TOOL_FAILURE", { agent, requestId, outcome: "FAILED", reservationConsumed: true, automaticRetry: false });
      } else {
        this.destination.set(requestId, 1);
        if (behavior === "TIMEOUT") {
          this.unknown.add(requestId);
          this.observed = null;
          await this.append("DESTINATION_TIMEOUT", { agent, requestId, outcome: "UNKNOWN", automaticRetry: false });
        } else {
          this.observed = [...this.destination.values()].reduce((a, b) => a + b, 0);
          await this.append("DESTINATION_OBSERVATION", { agent, requestId, effects: this.destination.get(requestId) ?? 0, source: "separate-browser-ledger", outcome: "COMPLETED" });
        }
      }
      return decision;
    });
  }
  async handoff() {
    return this.serial(async () => {
      if (this.used !== 2 || this.stopped || this.handedOff) throw Error("HANDOFF_NOT_AVAILABLE");
      this.handedOff = true;
      await this.append("HANDOFF", { from: "agent-1", to: "agent-2", quotaScope: loopPolicy.quotaScope, remaining: loopPolicy.maxAttempts - this.used, extraAuthority: false });
    });
  }
  async race(timeout: boolean) {
    if (this.used !== 2 || !this.handedOff) throw Error("RACE_NOT_READY");
    // Both requests are launched together; one serial reservation owns the final slot.
    return Promise.all([this.attempt("agent-1", "final-slot-agent-1", timeout ? "TIMEOUT" : "COMPLETE"), this.attempt("agent-2", "final-slot-agent-2", "COMPLETE")]);
  }
  async stop() {
    return this.serial(async () => { this.stopped = true; await this.append("EMERGENCY_STOP", { operator: "fictional-independent-operator", effective: true, externalEffectsUndone: false }); });
  }
  async recover() {
    return this.serial(async () => {
      if (!this.stopped || this.unknown.size) throw Error("RECONCILE_BEFORE_RECOVERY");
      this.stopped = false;
      await this.append("AUTHORIZED_RECOVERY", { operator: "fictional-second-operator", consumed: this.used, quotaReset: false });
    });
  }
  async reconcile() {
    return this.serial(async () => {
      if (!this.unknown.size) throw Error("NO_UNKNOWN_OUTCOME");
      for (const requestId of this.unknown) await this.append("RECONCILIATION", { requestId, effects: this.destination.get(requestId) ?? 0, source: "separate-browser-ledger", originalUnknownPreserved: true, redispatched: false });
      this.unknown.clear();
      this.observed = [...this.destination.values()].reduce((a, b) => a + b, 0);
    });
  }
}
