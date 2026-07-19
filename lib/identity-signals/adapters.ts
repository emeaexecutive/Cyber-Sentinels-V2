import "server-only";

import { createHash, createHmac } from "node:crypto";
import { HopaeAdapter as HardenedHopaeAdapter } from "@/lib/providers/adapters/hopae/hopae-adapter";
import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import type {
  AdapterCollectionResult,
  AdapterContext,
  IdentityCallbackInput,
  IdentityProviderCapability,
  IdentityProviderHealth,
  IdentityReasonCode,
  IdentitySignalAdapter,
  IdentitySignalStatus,
  IdentitySignalType,
  SignalEvidenceDraft,
  SignalOutcome,
} from "./types";

const providerNames: Record<string, string> = {
  hopae_connect: "Hopae Connect",
  world_id: "World ID",
  device_context: "Native device context",
  email: "Email ownership provider",
  phone: "Phone ownership provider",
  ip_reputation: "IP reputation provider",
  network_anonymity: "Network anonymity provider",
  geolocation: "Geolocation provider",
};

function provenance(source: SignalEvidenceDraft["provenance"]["source"]) {
  return { source, mappingVersion: "identity-signal-v1", collectedAt: new Date().toISOString() } as const;
}

function evidence(input: {
  signalType: IdentitySignalType;
  providerId: string;
  status: IdentitySignalStatus;
  outcome: SignalOutcome;
  reasonCode: IdentityReasonCode;
  limitation: string;
  source?: SignalEvidenceDraft["provenance"]["source"];
  sourceDigest?: string | null;
  payloadHash?: string | null;
  providerEventId?: string | null;
  providerReference?: string | null;
  providerTransactionId?: string | null;
  providerRequestId?: string | null;
  signatureVerified?: boolean;
  attributes?: Record<string, string | number | boolean | null>;
}): SignalEvidenceDraft {
  return {
    signalType: input.signalType,
    providerId: input.providerId,
    status: input.status,
    outcome: input.outcome,
    confidence: 0,
    riskScore: null,
    riskFlags: [],
    serverVerified: false,
    signatureVerified: input.signatureVerified ?? false,
    providerEventId: input.providerEventId ?? null,
    providerReference: input.providerReference ?? null,
    providerTransactionId: input.providerTransactionId ?? null,
    providerRequestId: input.providerRequestId ?? null,
    payloadHash: input.payloadHash ?? null,
    normalizedValue: null,
    provenance: provenance(input.source ?? "none"),
    sourceDigest: input.sourceDigest ?? null,
    reasonCodes: [input.reasonCode],
    limitations: [input.limitation],
    attributes: input.attributes,
    observedAt: new Date().toISOString(),
  };
}

function unavailable(signalType: IdentitySignalType, providerId: string, status: "BLOCKED" | "INCONCLUSIVE" | "UNAVAILABLE" | "UNSUPPORTED", code: IdentityReasonCode, limitation: string): AdapterCollectionResult {
  const outcome = status as SignalOutcome;
  return {
    transactionStatus: status === "BLOCKED" ? "BLOCKED" : status === "UNAVAILABLE" ? "UNAVAILABLE" : "INCONCLUSIVE",
    errorCode: code,
    limitations: [limitation],
    evidence: evidence({ signalType, providerId, status, outcome, reasonCode: code, limitation }),
  };
}

function capabilities(providerId: string, signals: readonly IdentitySignalType[], implementationStatus: IdentityProviderCapability["implementationStatus"], runtimeStatus: IdentityProviderCapability["runtimeStatus"], serverVerified: boolean, limitations: string[]): Promise<IdentityProviderCapability[]> {
  return Promise.resolve(signals.map((signalType) => ({ providerId, signalType, providerName: providerNames[providerId] ?? providerId, implementationStatus, runtimeStatus, serverVerified, limitations })));
}

function callbackHash(input: IdentityCallbackInput) {
  return createHash("sha256").update(input.rawBody).digest("hex");
}

export class DisabledSignalAdapter implements IdentitySignalAdapter {
  constructor(readonly providerId: string, readonly signals: readonly IdentitySignalType[], private readonly reason: string) {}
  getCapabilities() { return capabilities(this.providerId, this.signals, "MISSING", "DISABLED", false, [this.reason]); }
  async healthCheck(): Promise<IdentityProviderHealth> { return { providerId: this.providerId, available: false, state: "DISABLED", reasonCode: "PROVIDER_NOT_CONFIGURED", checkedAt: new Date().toISOString() }; }
  async collectSignal(signalType: IdentitySignalType) { return unavailable(signalType, this.providerId, "BLOCKED", "PROVIDER_NOT_CONFIGURED", this.reason); }
  async verifyCallback(input: IdentityCallbackInput) {
    return [evidence({ signalType: this.signals[0], providerId: this.providerId, status: "UNSUPPORTED", outcome: "UNSUPPORTED", reasonCode: "SIGNAL_UNSUPPORTED", limitation: this.reason, payloadHash: callbackHash(input) })];
  }
}

export class WorldIdSafeAdapter implements IdentitySignalAdapter {
  readonly providerId = "world_id";
  readonly signals = ["PROOF_OF_PERSONHOOD"] as const;
  getCapabilities() { return capabilities(this.providerId, this.signals, "PARTIALLY_IMPLEMENTED", "BLOCKED_BY_EXTERNAL_CONFIGURATION", false, ["Server verification is not implemented."]); }
  async healthCheck(): Promise<IdentityProviderHealth> { return { providerId: this.providerId, available: false, state: "UNAVAILABLE", reasonCode: "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED", checkedAt: new Date().toISOString() }; }
  async collectSignal(signalType: IdentitySignalType) { return unavailable(signalType, this.providerId, "INCONCLUSIVE", "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED", "A proof-shaped input is not verified evidence until the World ID server exchange succeeds."); }
  async verifyCallback(input: IdentityCallbackInput) {
    return [evidence({ signalType: "PROOF_OF_PERSONHOOD", providerId: this.providerId, status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", reasonCode: "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED", limitation: "Proof received — server verification pending.", payloadHash: callbackHash(input) })];
  }
}

export class DeviceContextAdapter implements IdentitySignalAdapter {
  readonly providerId = "device_context";
  readonly signals = ["DEVICE_CONTEXT"] as const;
  getCapabilities() { return capabilities(this.providerId, this.signals, "PARTIALLY_IMPLEMENTED", "BLOCKED_BY_EXTERNAL_CONFIGURATION", false, ["Client context is non-verifying."]); }
  async healthCheck(): Promise<IdentityProviderHealth> { const configured = Boolean(process.env.SECURITY_HASH_SECRET?.trim()); return { providerId: this.providerId, available: configured, state: configured ? "HEALTHY" : "MISCONFIGURED", reasonCode: configured ? null : "DEVICE_HASH_SECRET_NOT_CONFIGURED", checkedAt: new Date().toISOString() }; }
  async collectSignal(signalType: IdentitySignalType, context: AdapterContext) {
    const secret = process.env.SECURITY_HASH_SECRET?.trim();
    if (!secret) return unavailable(signalType, this.providerId, "BLOCKED", "DEVICE_HASH_SECRET_NOT_CONFIGURED", "SECURITY_HASH_SECRET is required for stable privacy-safe device context hashing.");
    const source = context.input.deviceContext;
    if (!source || typeof source !== "object" || Array.isArray(source)) return unavailable(signalType, this.providerId, "INCONCLUSIVE", "DEVICE_CONTEXT_NOT_PROVIDED", "No bounded device context was supplied.");
    const record = source as Record<string, unknown>;
    const allowed = ["browserFamily", "osFamily", "deviceCategory", "locale", "timezone"].reduce<Record<string, string>>((output, key) => {
      const value = typeof record[key] === "string" ? String(record[key]).trim().slice(0, 80) : "";
      if (value) output[key] = value;
      return output;
    }, {});
    if (!Object.keys(allowed).length) return unavailable(signalType, this.providerId, "INCONCLUSIVE", "DEVICE_CONTEXT_EMPTY", "Device context did not contain supported fields.");
    const digest = createHmac("sha256", secret).update(JSON.stringify(Object.entries(allowed).sort())).digest("hex");
    const draft = evidence({ signalType, providerId: this.providerId, status: "INCONCLUSIVE", outcome: "INCONCLUSIVE", reasonCode: "CLIENT_REPORTED_DEVICE_CONTEXT", limitation: "Client-reported context cannot verify identity.", source: "client_context", sourceDigest: digest, payloadHash: digest, attributes: { fieldCount: Object.keys(allowed).length } });
    draft.normalizedValue = allowed;
    return { transactionStatus: "INCONCLUSIVE" as const, limitations: draft.limitations, evidence: draft };
  }
  async verifyCallback(input: IdentityCallbackInput) { return [evidence({ signalType: "DEVICE_CONTEXT", providerId: this.providerId, status: "UNSUPPORTED", outcome: "UNSUPPORTED", reasonCode: "SIGNAL_UNSUPPORTED", limitation: "Device context has no callback contract.", payloadHash: callbackHash(input) })]; }
}

export type HopaeStarter = (context: AdapterContext) => Promise<{ providerReference: string; correlationId: string; providerRequestId?: string | null }>;

export class HopaeIdentityAdapter implements IdentitySignalAdapter {
  readonly providerId = "hopae_connect";
  readonly signals = ["IDENTITY_ASSERTION", "GOVERNMENT_ID"] as const;
  constructor(private readonly starter?: HopaeStarter) {}
  getCapabilities() { const config = inspectHopaeProviderConfig(); return capabilities(this.providerId, this.signals, "IMPLEMENTED", config.config.enabled ? (config.configured ? "AVAILABLE" : "BLOCKED_BY_CREDENTIALS") : "DISABLED", true, ["A signed callback and normalized evidence are required."]); }
  async healthCheck(): Promise<IdentityProviderHealth> {
    const config = inspectHopaeProviderConfig();
    if (!config.config.enabled) return { providerId: this.providerId, available: false, state: "DISABLED", reasonCode: "HOPAE_DISABLED", checkedAt: new Date().toISOString() };
    if (!config.configured) return { providerId: this.providerId, available: false, state: "MISCONFIGURED", reasonCode: "HOPAE_CREDENTIALS_OR_CONFIGURATION_MISSING", checkedAt: new Date().toISOString() };
    const snapshot = await new HardenedHopaeAdapter({ correlationId: crypto.randomUUID() }).healthCheck();
    return { providerId: this.providerId, available: snapshot.state === "HEALTHY", state: snapshot.state, reasonCode: snapshot.state === "HEALTHY" ? null : "PROVIDER_UNAVAILABLE", checkedAt: snapshot.checkedAt };
  }
  async collectSignal(signalType: IdentitySignalType, context: AdapterContext) {
    const config = inspectHopaeProviderConfig();
    if (!config.config.enabled) return unavailable(signalType, this.providerId, "BLOCKED", "HOPAE_DISABLED", "Hopae Connect is disabled by deployment configuration.");
    if (!config.configured) return unavailable(signalType, this.providerId, "BLOCKED", "HOPAE_CREDENTIALS_OR_CONFIGURATION_MISSING", `Missing or invalid Hopae configuration: ${[...config.missing, ...config.invalid].join(", ") || "unknown"}.`);
    if (!this.starter) return unavailable(signalType, this.providerId, "BLOCKED", "HOPAE_WORKFLOW_CONTEXT_REQUIRED", "The canonical Hopae workflow and governance context are required to start verification.");
    try {
      const started = await this.starter(context);
      const draft = evidence({ signalType, providerId: this.providerId, status: "PENDING", outcome: "INCONCLUSIVE", reasonCode: "PROVIDER_VERIFICATION_PENDING", limitation: "Session creation is not identity proof.", source: "provider_api", providerReference: started.providerReference, providerTransactionId: started.providerReference, providerRequestId: started.providerRequestId ?? null, attributes: { providerSessionPending: true } });
      return { transactionStatus: "INCONCLUSIVE" as const, providerSessionId: started.providerReference, providerTransactionId: started.providerReference, providerRequestId: started.providerRequestId ?? null, limitations: ["Provider session is pending a signed callback and server-side evidence retrieval."], evidence: draft };
    } catch (error) {
      return unavailable(signalType, this.providerId, "UNAVAILABLE", "HOPAE_SESSION_START_FAILED", error instanceof Error ? error.message : "Hopae session could not be started.");
    }
  }
  async verifyCallback(input: IdentityCallbackInput) {
    const callback = await new HardenedHopaeAdapter({ correlationId: input.correlationId }).verifyCallback(input);
    return this.signals.map((signalType) => evidence({ signalType, providerId: this.providerId, status: "PENDING", outcome: "INCONCLUSIVE", reasonCode: "PROVIDER_VERIFICATION_PENDING", limitation: "Signature is valid; server-side retrieval and normalization remain required.", source: "signed_callback", sourceDigest: callback.sourceDigest, payloadHash: callback.sourceDigest, providerEventId: callback.eventId, providerReference: callback.providerSessionId, providerTransactionId: callback.providerSessionId, signatureVerified: true }));
  }
}

export function buildIdentityAdapters(hopaeStarter?: HopaeStarter): IdentitySignalAdapter[] {
  return [
    new HopaeIdentityAdapter(hopaeStarter),
    new WorldIdSafeAdapter(),
    new DeviceContextAdapter(),
    new DisabledSignalAdapter("email", ["EMAIL_OWNERSHIP"], "No email ownership provider is configured."),
    new DisabledSignalAdapter("phone", ["PHONE_OWNERSHIP"], "No phone ownership provider is configured."),
    new DisabledSignalAdapter("ip_reputation", ["IP_REPUTATION"], "No IP reputation provider is configured."),
    new DisabledSignalAdapter("network_anonymity", ["NETWORK_ANONYMITY"], "No VPN, proxy, or Tor provider is configured."),
    new DisabledSignalAdapter("geolocation", ["GEOLOCATION"], "No geolocation provider is configured."),
  ];
}
