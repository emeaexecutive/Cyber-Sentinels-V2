import "server-only";

import { createHmac } from "node:crypto";
import { inspectHopaeProviderConfig } from "@/lib/providers/adapters/hopae/hopae-config";
import type { AdapterCollectionResult, AdapterContext, IdentitySignalAdapter, IdentitySignalType } from "./types";

function unavailable(signalType: IdentitySignalType, providerId: string, outcome: "BLOCKED" | "INCONCLUSIVE" | "UNAVAILABLE" | "UNSUPPORTED", code: string, limitation: string): AdapterCollectionResult {
  return {
    transactionStatus: outcome === "BLOCKED" ? "BLOCKED" : outcome === "UNAVAILABLE" ? "UNAVAILABLE" : "INCONCLUSIVE",
    errorCode: code,
    limitations: [limitation],
    evidence: { signalType, providerId, outcome, confidence: 0, serverVerified: false, reasonCodes: [code], limitations: [limitation], observedAt: new Date().toISOString() },
  };
}

export class DisabledSignalAdapter implements IdentitySignalAdapter {
  constructor(readonly providerId: string, readonly signals: readonly IdentitySignalType[], private readonly reason: string) {}
  async collect(signalType: IdentitySignalType) {
    return unavailable(signalType, this.providerId, "BLOCKED", "PROVIDER_NOT_CONFIGURED", this.reason);
  }
}

export class WorldIdSafeAdapter implements IdentitySignalAdapter {
  readonly providerId = "world_id";
  readonly signals = ["PROOF_OF_PERSONHOOD"] as const;
  async collect(signalType: IdentitySignalType) {
    return unavailable(signalType, this.providerId, "INCONCLUSIVE", "WORLD_ID_SERVER_VERIFICATION_NOT_IMPLEMENTED", "A proof-shaped input is not verified evidence until the World ID server exchange succeeds.");
  }
}

export class DeviceContextAdapter implements IdentitySignalAdapter {
  readonly providerId = "device_context";
  readonly signals = ["DEVICE_CONTEXT"] as const;
  async collect(signalType: IdentitySignalType, context: AdapterContext) {
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
    return {
      transactionStatus: "INCONCLUSIVE" as const,
      limitations: ["Client-reported device context is privacy-safe continuity context, not verified identity evidence."],
      evidence: { signalType, providerId: this.providerId, outcome: "INCONCLUSIVE" as const, confidence: 0, serverVerified: false, sourceDigest: digest, reasonCodes: ["CLIENT_REPORTED_DEVICE_CONTEXT"], limitations: ["Client-reported context cannot verify identity."], attributes: { fieldCount: Object.keys(allowed).length }, observedAt: new Date().toISOString() },
    };
  }
}

export type HopaeStarter = (context: AdapterContext) => Promise<{ providerReference: string; correlationId: string; providerRequestId?: string | null }>;

export class HopaeIdentityAdapter implements IdentitySignalAdapter {
  readonly providerId = "hopae_connect";
  readonly signals = ["IDENTITY_ASSERTION", "GOVERNMENT_ID"] as const;
  constructor(private readonly starter?: HopaeStarter) {}
  async collect(signalType: IdentitySignalType, context: AdapterContext) {
    const config = inspectHopaeProviderConfig();
    if (!config.config.enabled) return unavailable(signalType, this.providerId, "BLOCKED", "HOPAE_DISABLED", "Hopae Connect is disabled by deployment configuration.");
    if (!config.configured) return unavailable(signalType, this.providerId, "BLOCKED", "HOPAE_CREDENTIALS_OR_CONFIGURATION_MISSING", `Missing or invalid Hopae configuration: ${[...config.missing, ...config.invalid].join(", ") || "unknown"}.`);
    if (!this.starter) return unavailable(signalType, this.providerId, "BLOCKED", "HOPAE_WORKFLOW_CONTEXT_REQUIRED", "The canonical Hopae workflow and governance context are required to start verification.");
    try {
      const started = await this.starter(context);
      return {
        transactionStatus: "INCONCLUSIVE" as const,
        providerSessionId: started.providerReference,
        providerRequestId: started.providerRequestId ?? null,
        limitations: ["Provider session is pending a signed callback and server-side evidence retrieval."],
        evidence: { signalType, providerId: this.providerId, outcome: "INCONCLUSIVE" as const, confidence: 0, serverVerified: false, reasonCodes: ["PROVIDER_VERIFICATION_PENDING"], limitations: ["Session creation is not identity proof."], attributes: { providerSessionPending: true }, observedAt: new Date().toISOString() },
      };
    } catch (error) {
      return unavailable(signalType, this.providerId, "UNAVAILABLE", "HOPAE_SESSION_START_FAILED", error instanceof Error ? error.message : "Hopae session could not be started.");
    }
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
