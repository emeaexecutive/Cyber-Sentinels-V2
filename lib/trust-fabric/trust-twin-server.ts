import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createTrustTwin, type TrustTwin } from "./trust-twin.ts";
import type { TrustForecast } from "./trust-forecast.ts";
import { createAdaptiveVerificationCoverage, type AdaptiveVerificationCoverage, type AdaptiveVerificationRequirement } from "./adaptive-verification.ts";
import { createSentinelOperations, type SentinelOperations } from "./sentinel-agents.ts";
import { loadSentinelLifecycleRecords } from "./sentinel-agents-server.ts";

type Row = Record<string, any>;

export class TrustTwinServerError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) { super(message); this.name = "TrustTwinServerError"; }
}

function object(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }

export async function loadCurrentTrustTwin(input: { supabase: SupabaseClient; enterpriseId: string; entityId: string }): Promise<TrustTwin> {
  const result = await input.supabase
    .from("canonical_trust_transactions")
    .select("transaction_id,enterprise_id,operational_entity_id,subject_id,subject_type,accountable_owner_id,action_type,action_purpose,action_resource,action_environment,authority_reference,policy_id,policy_version,decision_time_snapshot,requested_at")
    .eq("enterprise_id", input.enterpriseId)
    .eq("operational_entity_id", input.entityId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (result.error) throw new TrustTwinServerError("Current Trust Twin is unavailable.", 503, "TRUST_TWIN_READ_FAILED");
  if (!result.data) throw new TrustTwinServerError("No canonical evidence exists for this entity.", 404, "TRUST_TWIN_NOT_FOUND");
  const row = result.data as Row;
  const snapshot = object(row.decision_time_snapshot);
  const stored = object(snapshot.trustTwin) as TrustTwin;
  if (stored?.twinId) {
    if (stored.enterpriseId !== input.enterpriseId || stored.entityId !== input.entityId) throw new TrustTwinServerError("Stored Trust Twin scope is inconsistent.", 409, "TRUST_TWIN_SCOPE_MISMATCH");
    return stored;
  }
  const forecast = object(snapshot.trustForecast) as TrustForecast;
  if (!forecast?.forecastId || !Array.isArray(forecast.conditions)) throw new TrustTwinServerError("The latest canonical record predates Trust Twin evidence.", 404, "TRUST_TWIN_EVIDENCE_UNAVAILABLE");
  if (forecast.enterpriseId !== input.enterpriseId || forecast.subject?.id !== input.entityId) throw new TrustTwinServerError("Forecast evidence is outside the requested scope.", 409, "TRUST_TWIN_SCOPE_MISMATCH");
  return createTrustTwin({
    enterpriseId: input.enterpriseId,
    entity: forecast.subject,
    owner: String(row.accountable_owner_id ?? snapshot.accountableHuman ?? "owner:unavailable"),
    purpose: String(row.action_purpose ?? "purpose:unavailable"),
    evaluatedAt: String(row.requested_at),
    forecastInput: {
      enterpriseId: input.enterpriseId,
      subject: forecast.subject,
      horizon: forecast.horizon,
      evaluatedAt: String(row.requested_at),
      policyReference: `${String(row.policy_id ?? "policy")}:${String(row.policy_version ?? snapshot.policyVersion ?? "unavailable")}`,
      conditions: forecast.conditions,
      authorityIntegrityFindings: forecast.forecastSignals,
      canonicalTransactionReference: String(row.transaction_id ?? "transaction:unavailable"),
      authorityReference: String(row.authority_reference ?? "authority:unavailable"),
      actionReference: `${String(row.action_type ?? "action")}:${String(row.action_resource ?? "unavailable")}`,
    },
    consequenceReach: {
      systems: [String(row.action_resource ?? input.entityId)],
      credentials: row.authority_reference ? [String(row.authority_reference)] : [],
      tools: row.action_type ? [String(row.action_type)] : [],
      dataClasses: snapshot.consequence ? [String(snapshot.consequence)] : [],
      destinations: row.action_resource ? [String(row.action_resource)] : [],
      downstreamAgents: [],
      productionResources: /prod/i.test(String(row.action_environment ?? "")) && row.action_resource ? [String(row.action_resource)] : [],
      financialExposure: [],
      humanImpactingSystems: [],
    },
  });
}

export async function loadAdaptiveVerificationCoverage(input: { supabase: SupabaseClient; enterpriseId: string; generatedAt: string }): Promise<AdaptiveVerificationCoverage> {
  const result = await input.supabase
    .from("canonical_trust_transactions")
    .select("enterprise_id,operational_entity_id,decision_time_snapshot,requested_at")
    .eq("enterprise_id", input.enterpriseId)
    .order("requested_at", { ascending: false })
    .limit(500);
  if (result.error) throw new TrustTwinServerError("Adaptive verification coverage is unavailable.", 503, "ADAPTIVE_VERIFICATION_COVERAGE_READ_FAILED");

  const requirements = new Map<string, AdaptiveVerificationRequirement>();
  for (const candidate of result.data ?? []) {
    const row = candidate as Row;
    const entityId = String(row.operational_entity_id ?? "");
    if (!entityId || requirements.has(entityId) || String(row.enterprise_id) !== input.enterpriseId) continue;
    const snapshot = object(row.decision_time_snapshot);
    const trustTwin = object(snapshot.trustTwin);
    const verification = object(trustTwin.adaptiveVerification) as AdaptiveVerificationRequirement;
    if (!verification?.verificationId) continue;
    if (verification.enterpriseId !== input.enterpriseId || verification.entityId !== entityId) {
      throw new TrustTwinServerError("Stored adaptive verification scope is inconsistent.", 409, "ADAPTIVE_VERIFICATION_SCOPE_MISMATCH");
    }
    requirements.set(entityId, verification);
  }

  return createAdaptiveVerificationCoverage({
    enterpriseId: input.enterpriseId,
    generatedAt: input.generatedAt,
    requirements: [...requirements.values()],
  });
}

export async function loadSentinelOperations(input: { supabase: SupabaseClient; enterpriseId: string; generatedAt: string; owner?: string }): Promise<SentinelOperations> {
  const result = await input.supabase
    .from("canonical_trust_transactions")
    .select("enterprise_id,operational_entity_id,decision_time_snapshot,requested_at")
    .eq("enterprise_id", input.enterpriseId)
    .order("requested_at", { ascending: false })
    .limit(500);
  if (result.error) throw new TrustTwinServerError("Sentinel Operations is unavailable.", 503, "SENTINEL_OPERATIONS_READ_FAILED");

  const twins = new Map<string, TrustTwin>();
  for (const candidate of result.data ?? []) {
    const row = candidate as Row;
    const entityId = String(row.operational_entity_id ?? "");
    if (!entityId || twins.has(entityId) || String(row.enterprise_id) !== input.enterpriseId) continue;
    const snapshot = object(row.decision_time_snapshot);
    const twin = object(snapshot.trustTwin) as TrustTwin;
    if (!twin?.twinId) continue;
    if (twin.enterpriseId !== input.enterpriseId || twin.entityId !== entityId) {
      throw new TrustTwinServerError("Stored Sentinel source scope is inconsistent.", 409, "SENTINEL_OPERATIONS_SCOPE_MISMATCH");
    }
    twins.set(entityId, twin);
  }

  const source = { enterpriseId: input.enterpriseId, twins: [...twins.values()], generatedAt: input.generatedAt, owner: input.owner };
  const provisional = createSentinelOperations(source);
  const lifecycleRecords = await loadSentinelLifecycleRecords({ supabase: input.supabase, enterpriseId: input.enterpriseId, sentinels: provisional.sentinels });
  return Object.keys(lifecycleRecords).length ? createSentinelOperations({ ...source, lifecycleRecords }) : provisional;
}
