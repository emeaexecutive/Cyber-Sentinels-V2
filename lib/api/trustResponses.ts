import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getRequestRiskFields } from "@/lib/security";
import { createAuditLog } from "@/lib/trust-engine/createAuditLog";
import { createSignal } from "@/lib/trust-engine/createSignal";

export type JsonObject = Record<string, unknown>;

export function trustApiOk<T extends JsonObject>(body: T, status = 200) {
  return NextResponse.json({ ok: true, ...body }, { status });
}

export function trustApiError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export function validateTrustApiKey(req: Request) {
  const configuredKey = process.env.TRUST_API_KEY;

  // Placeholder: production should require scoped API keys, rotation, quotas,
  // replay protection, and per-customer rate limits.
  if (!configuredKey) {
    return { ok: true, mode: "placeholder" as const };
  }

  const headerKey =
    req.headers.get("x-cyber-sentinels-api-key") ??
    req.headers.get("x-api-key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (headerKey !== configuredKey) {
    return { ok: false, error: "Unauthorized" };
  }

  return { ok: true, mode: "api_key" as const };
}

export async function readJsonObject(req: Request) {
  try {
    const body = (await req.json()) as unknown;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as JsonObject;
  } catch {
    return null;
  }
}

export function getBoundedNumber(
  body: JsonObject,
  field: string,
  fallback: number
) {
  const rawValue = body[field];
  const value =
    rawValue === undefined || rawValue === null || rawValue === ""
      ? fallback
      : Number(rawValue);

  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Invalid input");
  }

  return Math.round(value);
}

export function getOptionalBoolean(body: JsonObject, field: string) {
  const value = body[field];

  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") throw new Error("Invalid input");

  return value;
}

export function getOptionalString(
  body: JsonObject,
  field: string,
  maxLength = 160
) {
  const value = body[field];

  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value.trim();
}

export function getAllowedString<T extends readonly string[]>(
  body: JsonObject,
  field: string,
  allowedValues: T,
  fallback: T[number]
): T[number] {
  const value = String(body[field] ?? fallback);

  if (!allowedValues.includes(value)) {
    throw new Error("Invalid input");
  }

  return value as T[number];
}

export function getRiskLevel(input: {
  trustScore: number;
  humanPresenceIndex: number;
  originTraceScore: number;
  syntheticRisk: number;
}) {
  if (
    input.syntheticRisk >= 85 ||
    input.trustScore < 35 ||
    input.humanPresenceIndex < 40 ||
    input.originTraceScore < 35
  ) {
    return "critical";
  }

  if (
    input.syntheticRisk >= 70 ||
    input.trustScore < 55 ||
    input.humanPresenceIndex < 60 ||
    input.originTraceScore < 50
  ) {
    return "high";
  }

  if (
    input.syntheticRisk >= 40 ||
    input.trustScore < 75 ||
    input.humanPresenceIndex < 75 ||
    input.originTraceScore < 70
  ) {
    return "medium";
  }

  return "low";
}

export function getRecommendedAction(riskLevel: string) {
  if (riskLevel === "critical") return "deny";
  if (riskLevel === "high") return "manual_review";
  if (riskLevel === "medium") return "needs_more_evidence";

  return "allow";
}

export async function recordTrustApiCall(
  supabase: SupabaseClient,
  req: Request,
  input: {
    route: string;
    actor?: string | null;
    signal?: "trust_api_check_requested" | "trust_api_decision_requested";
    metadata?: Record<string, unknown>;
  }
) {
  const requestRisk = getRequestRiskFields(req);
  const actor = input.actor ?? "trust_api";

  if (input.signal) {
    await createSignal(supabase, input.signal);
  }

  await createAuditLog(supabase, "trust_api_called", actor, {
    route: input.route,
    ...(input.metadata ?? {}),
    ...requestRisk,
  });
}
