import { randomUUID } from "node:crypto";
import { appendSwarmEvent, type SwarmEvent, type SwarmStore } from "../swarm/containment.ts";
import { hashCanonical } from "../../src/lib/trust-core/hash.ts";

/** Server-owned, explicitly approved non-Production budget. Never read from a
 * model, browser command, evidence record, agent field or provider response. */
export type ModelBudgetConfiguration = {
  approved: true; environment: "test" | "staging"; tenantId: string;
  scope: string; policyVersion: string; provider: string; model: string;
  windowMs: number; maxWindowCalls: number; maxTotalCalls: number;
  maxAttemptsPerInvestigation: number; maxParallel: number; maxDurationMs: number;
  maxInputBytes: number; maxOutputTokens: 1800;
  maxWindowSpendMicros: number; maxTotalSpendMicros: number; reserveMicrosPerCall: number;
};
export type IndependentModelCharge = {
  tenantId: string; reservationDigest: string; provider: string; model: string;
  chargedMicros: number; invoiceLineId: string; evidenceRef: string;
};
type BudgetDependencies = {
  store: SwarmStore; now(): number;
  /** Must authenticate an independent billing source and operator authorization.
   * Model text, usage counters and locally estimated prices are not invoices. */
  verifyBilling?: (tenantId: string, evidence: unknown) => Promise<IndependentModelCharge>;
};
export class ModelBudgetError extends Error {
  constructor(readonly code: string) { super(code); this.name = "ModelBudgetError"; }
}
const fail = (code: string): never => { throw new ModelBudgetError(code); };
const reference = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_.:/-]{1,240}$/.test(value) && !["constructor", "prototype", "__proto__"].includes(value);
const positive = (value: number) => Number.isSafeInteger(value) && value > 0;
const reserved = (event: SwarmEvent, scope: string) => event.kind === "SOC_MODEL_BUDGET_RESERVED" && event.details.scope === scope;

/** Persistent conservative accounting: every attempted provider call reserves
 * its approved worst-case charge. Success, usage telemetry and timeout all leave
 * billing UNKNOWN. Only independently verified billing releases the reservation.
 * Unknown reservations survive process restarts and window rollover. */
export class SocModelBudget {
  readonly configuration: Readonly<ModelBudgetConfiguration>;
  readonly configurationDigest: string;
  constructor(private readonly deps: BudgetDependencies, configuration: ModelBudgetConfiguration) {
    const c = structuredClone(configuration);
    if (c.approved !== true || !["test", "staging"].includes(c.environment) || ![c.tenantId, c.scope, c.policyVersion, c.provider, c.model].every(reference)
      || ![c.windowMs, c.maxWindowCalls, c.maxTotalCalls, c.maxAttemptsPerInvestigation, c.maxParallel, c.maxDurationMs, c.maxInputBytes, c.maxWindowSpendMicros, c.maxTotalSpendMicros, c.reserveMicrosPerCall].every(positive)
      || c.maxInputBytes > 32768 || c.maxOutputTokens !== 1800
      || c.maxDurationMs > 30000 || c.maxAttemptsPerInvestigation > 3 || c.reserveMicrosPerCall > c.maxWindowSpendMicros || c.reserveMicrosPerCall > c.maxTotalSpendMicros) fail("SOC_MODEL_BUDGET_CONFIGURATION");
    this.configuration = Object.freeze(c);
    this.configurationDigest = hashCanonical(c);
  }
  private tenant(tenantId: string) { if (tenantId !== this.configuration.tenantId) fail("SOC_MODEL_BUDGET_TENANT_DENIED"); }
  async reserve(tenantId: string, investigationId: string, invocationId: string) {
    this.tenant(tenantId);
    if (!reference(investigationId) || !reference(invocationId)) fail("SOC_MODEL_BUDGET_REFERENCE");
    const c = this.configuration;
    const result = await this.deps.store.transact(tenantId, state => {
      const now = this.deps.now();
      if (!Number.isSafeInteger(now) || now < 0) fail("SOC_MODEL_BUDGET_CLOCK");
      const windowStart = Math.floor(now / c.windowMs) * c.windowMs;
      const reservations = state.events.filter(e => reserved(e, c.scope));
      const settlements = new Map(state.events.filter(e => e.kind === "SOC_MODEL_BUDGET_RECONCILED").map(e => [e.details.reservationDigest, e]));
      const unsettled = reservations.filter(e => !settlements.has(e.digest));
      // A timeout/response is not proof provider execution and billing ended.
      // Unknown invocations retain both money and their parallel slot until an
      // independent charge observation reconciles them.
      const active = unsettled;
      const used = (events: SwarmEvent[]) => events.reduce((sum, e) => sum + Number(settlements.get(e.digest)?.details.chargedMicros ?? e.details.reservedMicros), 0);
      const inWindow = reservations.filter(e => e.at >= windowStart && e.at < windowStart + c.windowMs);
      // Carry all older unknown charges into every new window; a clock/window
      // change must not reset money potentially already consumed at a provider.
      const carry = unsettled.filter(e => e.at < windowStart).reduce((sum, e) => sum + Number(e.details.reservedMicros), 0);
      let reason: string | null = null;
      // A restart must not silently widen a previously established scope's
      // budget or swap its provider/model, even when a policy-version label is
      // reused. Old reservations without a binding are deliberately fail-closed.
      if (reservations.some(e => e.details.configurationDigest !== this.configurationDigest)) reason = "SOC_MODEL_POLICY_BINDING_CHANGED";
      else if (reservations.some(e => e.details.invocationId === invocationId)) reason = "SOC_MODEL_INVOCATION_REPLAY";
      else if (reservations.filter(e => e.details.investigationId === investigationId).length >= c.maxAttemptsPerInvestigation) reason = "SOC_MODEL_RETRY_LIMIT";
      else if (active.length >= c.maxParallel) reason = "SOC_MODEL_PARALLEL_LIMIT";
      else if (inWindow.length >= c.maxWindowCalls || reservations.length >= c.maxTotalCalls) reason = "SOC_MODEL_CALL_LIMIT";
      else if (used(inWindow) + carry + c.reserveMicrosPerCall > c.maxWindowSpendMicros || used(reservations) + c.reserveMicrosPerCall > c.maxTotalSpendMicros) reason = "SOC_MODEL_SPEND_LIMIT";
      if (reason) return { allowed: false as const, reason, event: appendSwarmEvent(state, now, "SOC_MODEL_BUDGET_DENIED", "Sentinel-Copilot", investigationId, { scope: c.scope, configurationDigest: this.configurationDigest, invocationId, reason, authorityConferred: false }) };
      return { allowed: true as const, reason: null, event: appendSwarmEvent(state, now, "SOC_MODEL_BUDGET_RESERVED", "Sentinel-Copilot", investigationId, {
        scope: c.scope, configurationDigest: this.configurationDigest, policyVersion: c.policyVersion, provider: c.provider, model: c.model, environment: c.environment,
        investigationId, invocationId, reservedMicros: c.reserveMicrosPerCall, windowStart, windowMs: c.windowMs,
        maxDurationMs: c.maxDurationMs, billing: "UNKNOWN", estimateIsObservedBilling: false, automaticRetry: false,
        maxInputBytes: c.maxInputBytes, maxOutputTokens: c.maxOutputTokens,
      }) };
    });
    if (!result.allowed) fail(result.reason);
    return result.event;
  }
  async run<T>(tenantId: string, investigationId: string, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const reservation = await this.reserve(tenantId, investigationId, randomUUID());
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let observation = "PROVIDER_FAILURE_OR_UNCERTAIN";
    try {
      const result = await Promise.race([Promise.resolve().then(() => work(controller.signal)), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ModelBudgetError("SOC_MODEL_DURATION_LIMIT")); }, this.configuration.maxDurationMs);
      })]);
      observation = "PROVIDER_RESPONSE_RECEIVED_NOT_BILLING";
      return result;
    } finally {
      if (timer) clearTimeout(timer);
      await this.deps.store.transact(tenantId, state => appendSwarmEvent(state, this.deps.now(), "SOC_MODEL_BUDGET_UNKNOWN", "Sentinel-Copilot", investigationId, {
        scope: this.configuration.scope, reservationDigest: reservation.digest, observation, billing: "UNKNOWN", reservedMicros: this.configuration.reserveMicrosPerCall, automaticRetry: false,
      }));
    }
  }
  async reconcile(tenantId: string, reservationDigest: string, evidence: unknown) {
    this.tenant(tenantId);
    if (!this.deps.verifyBilling) fail("SOC_MODEL_BILLING_VERIFIER_REQUIRED");
    const charge = structuredClone(await this.deps.verifyBilling(tenantId, structuredClone(evidence)));
    const c = this.configuration;
    if (charge.tenantId !== tenantId || charge.reservationDigest !== reservationDigest || !reference(charge.invoiceLineId) || !reference(charge.evidenceRef) || !Number.isSafeInteger(charge.chargedMicros) || charge.chargedMicros < 0) fail("SOC_MODEL_BILLING_EVIDENCE_DENIED");
    return this.deps.store.transact(tenantId, state => {
      const reservation = state.events.find(e => e.digest === reservationDigest && reserved(e, c.scope));
      if (!reservation || reservation.details.provider !== charge.provider || reservation.details.model !== charge.model
        || state.events.some(e => e.kind === "SOC_MODEL_BUDGET_RECONCILED" && (e.details.reservationDigest === reservationDigest || e.details.invoiceLineId === charge.invoiceLineId))) fail("SOC_MODEL_BILLING_REPLAY_OR_BINDING");
      // An invoice above the approved worst case is observable accounting drift,
      // never silently accepted as successful enforcement. Keep the reserve held.
      if (charge.chargedMicros > Number(reservation.details.reservedMicros)) fail("SOC_MODEL_BILLING_EXCEEDS_RESERVATION");
      return appendSwarmEvent(state, this.deps.now(), "SOC_MODEL_BUDGET_RECONCILED", "independent-billing-verifier", reservation.subjectId, { scope: c.scope, ...charge, billing: "INDEPENDENTLY_VERIFIED" });
    });
  }
}
