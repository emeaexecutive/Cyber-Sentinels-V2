import { createHash } from "node:crypto";
import { identitySignalTypes, type ConfidenceResult, type IdentitySignalType, type SignalEvidenceDraft } from "./types.ts";

const signalSet = new Set<string>(identitySignalTypes);

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function parseRequestedSignals(value: unknown): IdentitySignalType[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 16) throw new Error("requestedSignals must contain between 1 and 16 supported signals.");
  const signals = [...new Set(value.map((item) => String(item).trim().toUpperCase()))];
  if (signals.some((signal) => !signalSet.has(signal))) throw new Error("requestedSignals contains an unsupported signal.");
  return signals as IdentitySignalType[];
}

export function boundedText(value: unknown, field: string, maximum: number) {
  const text = String(value ?? "").trim();
  if (!text || text.length > maximum) throw new Error(`${field} is required and must be at most ${maximum} characters.`);
  return text;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalize(item)]));
  return value;
}

export function requestDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

export function calculateIdentityConfidence(evidence: SignalEvidenceDraft[]): ConfidenceResult {
  const verified = evidence.filter((item) => item.serverVerified && item.outcome === "VERIFIED");
  if (!verified.length) return {
    score: 0,
    band: "NONE",
    status: "INSUFFICIENT_EVIDENCE",
    verifiedSignalCount: 0,
    totalSignalCount: evidence.length,
    reasonCodes: ["NO_SERVER_VERIFIED_EVIDENCE"],
    methodologyVersion: "identity-confidence-v1",
  };
  const score = Math.round(verified.reduce((sum, item) => sum + Math.max(0, Math.min(100, item.confidence)), 0) / verified.length);
  const band = score >= 90 ? "VERY_HIGH" : score >= 75 ? "HIGH" : score >= 50 ? "MODERATE" : "LOW";
  return {
    score,
    band,
    status: verified.length >= 2 && score >= 75 ? "ESTABLISHED" : "PROVISIONAL",
    verifiedSignalCount: verified.length,
    totalSignalCount: evidence.length,
    reasonCodes: verified.length >= 2 ? ["MULTI_SIGNAL_SERVER_VERIFIED"] : ["SINGLE_SERVER_VERIFIED_SIGNAL"],
    methodologyVersion: "identity-confidence-v1",
  };
}
