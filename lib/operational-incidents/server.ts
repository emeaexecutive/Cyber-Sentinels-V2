import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { PublicApiPrincipal } from "@/lib/public-api/v1/authentication";
import { PublicApiError } from "@/lib/public-api/v1/contracts";
import { hashCanonical } from "@/src/lib/trust-core/hash";
import { buildIncidentPackage, reference, validateIncidentRecord, verifyEvidence, verifyObservationClaims, type Row } from "./model";

const notFound = () => new PublicApiError("RESOURCE_NOT_FOUND", "The resource is unavailable.", 404);
function publicValidation<T>(validate: () => T): T {
  try { return validate(); } catch (error) {
    const value = error as { code?: string; status?: number; message?: string };
    if (["INVALID_REQUEST", "EVIDENCE_DIGEST_MISMATCH", "RESOURCE_NOT_FOUND"].includes(value.code ?? "")) throw new PublicApiError(value.code!, value.message ?? "Invalid incident input.", value.status ?? 400);
    throw error;
  }
}
function databaseError(error: { code?: string; message?: string } | null): never {
  if (error?.code === "P0002" || error?.code === "23503") throw notFound();
  if (error?.code === "42501") throw new PublicApiError("INSUFFICIENT_SCOPE", "Incident access denied.", 403);
  if (error?.code === "23505") throw new PublicApiError("IDEMPOTENCY_CONFLICT", "Incident record already exists.", 409);
  throw new PublicApiError("INTERNAL_ERROR", "Incident persistence is unavailable.", 503);
}
async function transaction(principal: PublicApiPrincipal, id: string) {
  const result = await createServiceRoleClient().from("canonical_trust_transactions").select("*")
    .eq("enterprise_id", principal.tenantId).eq("actor_id", principal.clientId).eq("transaction_id", publicValidation(() => reference(id))).maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data) throw notFound();
  return result.data;
}
async function incident(principal: Pick<PublicApiPrincipal, "tenantId"> & { clientId?: string }, id: string) {
  let query = createServiceRoleClient().from("incident_regulatory_assessments").select("*")
    .eq("enterprise_id", principal.tenantId).eq("evidence_mode", "CANONICAL_OPERATIONAL").eq("id", publicValidation(() => reference(id)));
  if (principal.clientId) query = query.eq("created_by", principal.clientId);
  const result = await query.maybeSingle();
  if (result.error) databaseError(result.error);
  if (!result.data) throw notFound();
  return result.data;
}
async function persist(principal: PublicApiPrincipal, id: string, operation: string, record: Row) {
  const result = await createServiceRoleClient().rpc("persist_operational_incident_v2", {
    p_tenant_id: principal.tenantId, p_client_id: principal.clientId, p_key_id: principal.keyId,
    p_incident_id: id, p_operation: operation, p_record: record,
  });
  if (result.error) databaseError(result.error);
  return result.data;
}
export async function recordIncident(principal: PublicApiPrincipal, value: unknown, incidentId?: string) {
  const input = publicValidation(() => validateIncidentRecord(value, !incidentId));
  if (incidentId) await incident(principal, incidentId);
  const tx = await transaction(principal, input.transaction_id);
  if (Date.parse(input.observed_at) > Date.now() + 30_000) throw new PublicApiError("INVALID_REQUEST", "Observation timestamp is in the future.", 400);
  if (input.evidence_object_id) {
    const result = await createServiceRoleClient().from("evidence_objects").select("*")
      .eq("enterprise_id", principal.tenantId).eq("evidence_id", input.evidence_object_id).eq("subject_id", tx.subject_id).maybeSingle();
    if (result.error) databaseError(result.error);
    if (!result.data) throw notFound();
    publicValidation(() => {
      verifyEvidence(result.data, principal.tenantId, tx.subject_id, input.evidence_digest);
      verifyObservationClaims(input, result.data);
    });
  }
  const id = incidentId ?? crypto.randomUUID();
  const content = { ...input, id: crypto.randomUUID() };
  return persist(principal, id, incidentId ? "append" : "open", { ...content, content_digest: hashCanonical(content) });
}
export async function readIncident(principal: Pick<PublicApiPrincipal, "tenantId"> & { clientId?: string }, id: string) {
  const root = await incident(principal, id);
  const db = createServiceRoleClient();
  const [linksResult, eventsResult] = await Promise.all([
    db.from("incident_evidence_links").select("*").eq("enterprise_id", principal.tenantId).eq("incident_id", id).order("received_at").limit(501),
    db.from("incident_chronology_events").select("*").eq("enterprise_id", principal.tenantId).eq("incident_id", id).order("created_at").limit(501),
  ]);
  if (linksResult.error || eventsResult.error) databaseError(linksResult.error ?? eventsResult.error);
  const links = linksResult.data ?? [];
  if (links.length > 500 || (eventsResult.data?.length ?? 0) > 500) throw new PublicApiError("INVALID_REQUEST", "Incident exceeds the bounded export size.", 413);
  const transactionIds = [...new Set(links.map(row => row.transaction_id))];
  const evidenceIds = [...new Set(links.map(row => row.evidence_object_id).filter(Boolean))];
  const [txResult, evResult] = await Promise.all([
    transactionIds.length ? db.from("canonical_trust_transactions").select("*").eq("enterprise_id", principal.tenantId).in("transaction_id", transactionIds) : Promise.resolve({ data: [], error: null }),
    evidenceIds.length ? db.from("evidence_objects").select("*").eq("enterprise_id", principal.tenantId).in("evidence_id", evidenceIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (txResult.error || evResult.error) databaseError(txResult.error ?? evResult.error);
  const transactions = txResult.data ?? [];
  if (principal.clientId && transactions.some(tx => tx.actor_id !== principal.clientId)) throw notFound();
  const authorities = [...new Set(transactions.map(tx => tx.authority_reference))];
  const authorityResult = authorities.length ? await db.from("trust_contracts").select("*").eq("enterprise_id", principal.tenantId).in("contract_id", authorities) : { data: [], error: null };
  if (authorityResult.error) databaseError(authorityResult.error);
  const outcomeSources = [
    { table: "public_api_outcome_submissions", tenant: "tenant_id", fields: "tenant_id,transaction_id,submission_id,source_id,destination,result,observed_at,evidence_reference,independence,submission_digest" },
    { table: "native_enforcement_outcomes", tenant: "enterprise_id", fields: "enterprise_id,transaction_id,outcome_id,outcome,control_status,reason_codes,contradiction_codes,evidence_independence,correlated_at" },
    { table: "external_action_outcomes", tenant: "enterprise_id", fields: "enterprise_id,transaction_id,outcome_id,outcome,external_reference,reason,occurred_at" },
  ];
  const outcomeResults = await Promise.all(outcomeSources.map(source => transactionIds.length ? db.from(source.table).select(source.fields).eq(source.tenant, principal.tenantId).in("transaction_id", transactionIds).limit(501) : Promise.resolve({ data: [], error: null })));
  const existingOutcomes: Row[] = [];
  outcomeResults.forEach((result, index) => {
    if (result.error) databaseError(result.error);
    if ((result.data?.length ?? 0) > 500) throw new PublicApiError("INVALID_REQUEST", "Incident outcomes exceed the bounded export size.", 413);
    for (const row of result.data ?? []) existingOutcomes.push({ ...(row as unknown as Row), enterprise_id: principal.tenantId, source_table: outcomeSources[index].table });
  });
  return buildIncidentPackage({ incident: root, links, events: eventsResult.data ?? [], transactions, evidence: evResult.data ?? [], authorities: (authorityResult.data ?? []).map(row => ({ ...row, id: row.contract_id })), existingOutcomes, generatedAt: new Date().toISOString(), id: crypto.randomUUID() });
}
export async function exportIncident(principal: PublicApiPrincipal, id: string) {
  const pack = await readIncident(principal, id);
  if (Buffer.byteLength(JSON.stringify(pack), "utf8") > 1_000_000) throw new PublicApiError("INVALID_REQUEST", "Incident exceeds the bounded export size.", 413);
  const stored = await persist(principal, id, "export", pack);
  return { package: pack, stored };
}
