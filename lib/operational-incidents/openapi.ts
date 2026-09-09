const incidentParameter = { name: "incidentId", in: "path", required: true, schema: { type: "string", format: "uuid" } };
const body = { type: "object", additionalProperties: false, required: ["transaction_id", "summary", "observed_at"], properties: {
  transaction_id: { type: "string", format: "uuid" }, summary: { type: "string", minLength: 1, maxLength: 1000 },
  observed_at: { type: "string", format: "date-time", description: "UTC ISO timestamp including milliseconds, ending Z." },
  kind: { enum: ["TRANSACTION_LINK", "EXECUTION_OBSERVATION", "OUTCOME", "DETECTION", "INTERVENTION", "CONTAINMENT", "REMEDIATION", "PURPOSE_OBSERVATION"] },
  evidence_object_id: { type: "string", format: "uuid" }, evidence_digest: { type: "string", pattern: "^[a-f0-9]{64}$" },
  context: { type: "object", additionalProperties: false, properties: Object.fromEntries(["provider_account", "session", "api_tool", "model_service", "infrastructure", "credential_reference"].map(key => [key, { type: "string", maxLength: 200 }])) },
  observed_purpose: { type: "string", maxLength: 1000 }, outcome_layer: { enum: ["provider", "runtime", "destination"] }, outcome_status: { enum: ["SUCCEEDED", "FAILED", "UNKNOWN"] },
} };
const response = { description: "Tenant/client-bound incident record or integrity-digested canonical evidence package.", content: { "application/json": { schema: { type: "object" } } } };
const errors = Object.fromEntries([400, 401, 403, 404, 409, 413, 429, 503].map(status => [status, { description: "Existing public API error envelope; inaccessible and absent resources share 404.", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } }]));
function operation(operationId: string, scope: string, status: string, parameters: object[], schema?: object) {
  return { operationId, tags: ["Incident Evidence"], "x-required-scopes": [scope], parameters,
    description: "Optional V2 evidence continuity. No change to V1 authorization. Source assertions remain attributed; missing context is UNKNOWN. Timeline verification means complete integrity-checked reconstruction, not independent source clock verification. Canonical export readiness is not regulatory approval. Maximum 500 chronology records per incident export.",
    ...(schema ? { requestBody: { required: true, content: { "application/json": { schema } } } } : {}), responses: { [status]: response, ...errors } };
}
export const incidentPaths = {
  "/api/v1/incidents": { post: operation("openIncident", "incidents:write", "201", [], { ...body, properties: { ...body.properties, kind: { const: "TRANSACTION_LINK" } } }) },
  "/api/v1/incidents/{incidentId}": { get: operation("getIncident", "incidents:read", "200", [incidentParameter]) },
  "/api/v1/incidents/{incidentId}/chronology": { post: operation("appendIncidentChronology", "incidents:write", "201", [incidentParameter], { ...body, required: [...body.required, "kind"] }) },
  "/api/v1/incidents/{incidentId}/replay": { get: operation("replayIncident", "incidents:read", "200", [incidentParameter]) },
  "/api/v1/incidents/{incidentId}/exports": { post: operation("exportIncident", "evidence:export", "201", [incidentParameter], { type: "object", additionalProperties: false }) },
};
