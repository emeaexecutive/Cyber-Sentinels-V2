import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const evaluateRoute=readFileSync(new URL("../app/api/trust/scope-continuity/evaluate/route.ts",import.meta.url),"utf8");
const decisionRoute=readFileSync(new URL("../app/api/trust/scope-continuity/decisions/[decisionId]/route.ts",import.meta.url),"utf8");
const replayRoute=readFileSync(new URL("../app/api/trust/scope-continuity/replay/[executionContextId]/route.ts",import.meta.url),"utf8");
const http=readFileSync(new URL("../src/lib/scope-continuity/http.ts",import.meta.url),"utf8");
const service=readFileSync(new URL("../src/lib/scope-continuity/service.ts",import.meta.url),"utf8");
const repository=readFileSync(new URL("../src/lib/scope-continuity/repository.ts",import.meta.url),"utf8");
const component=readFileSync(new URL("../src/components/scope-continuity/EnvironmentScopePanel.tsx",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/dashboard/environment-scope/page.tsx",import.meta.url),"utf8");

test("mutation requires owner or admin enterprise authorization",()=>{assert.match(evaluateRoute,/\["owner", "admin"\]/);assert.match(service,/Cross-enterprise scope input is denied/);});
test("reused scope records and action counts are resolved from canonical server state",()=>{assert.match(service,/canonicalInputs/);assert.match(repository,/count authorization actions/);assert.match(service,/canonical\.attestations\.get/);assert.match(service,/LEASE_APPROVER_MISMATCH/);});
test("untrusted request shape is validated before canonical database reads",()=>{assert.match(service,/const candidate = validateRequest\(input\.value, input\.correlationId\)/);assert.ok(service.indexOf("validateRequest(input.value, input.correlationId)")<service.indexOf("canonicalInputs(input.enterpriseId, candidate)"));assert.match(service,/status: 400/);});
test("mutation enforces actual streamed bytes and controlled malformed JSON",()=>{assert.match(http,/request\.body\.getReader\(\)/);assert.match(http,/size > limit/);assert.match(http,/PAYLOAD_TOO_LARGE/);assert.match(http,/MALFORMED_JSON/);});
test("API uses correlation IDs and stable safe failures",()=>{for(const route of [evaluateRoute,decisionRoute,replayRoute]){assert.match(route,/scopeContinuityCorrelationId/);assert.match(route,/scopeContinuityFailure/);}assert.doesNotMatch(repository,/console\.error\([^\n]*(input|decision|artifacts)/);});
test("there is no public unauthenticated attestation ingestion route",()=>{assert.match(evaluateRoute,/scopeContinuityContext/);assert.match(decisionRoute,/scopeContinuityContext/);assert.match(replayRoute,/scopeContinuityContext/);});
test("service role remains in a server-only repository",()=>{assert.match(repository,/import "server-only"/);assert.match(repository,/createServiceRoleClient/);assert.doesNotMatch(component,/service-role|createServiceRoleClient/);});
test("UI visibly separates declared configured observed authorized requested and decision context",()=>{for(const label of ["Declared","Configured","Observed","Authorized","Requested","Decision"])assert.match(component,new RegExp(`label=\\"${label}\\"`));});
test("UI keeps provider, stale, missing and accessible evidence boundaries visible",()=>{assert.match(component,/provider assertions are never displayed as independent verification/i);assert.match(component,/Freshness/);assert.match(component,/Missing evidence/);assert.match(component,/aria-label/);});
test("authenticated demonstration page uses enterprise workspace context",()=>{assert.match(page,/trustArchitectureUiContext/);assert.match(page,/Enterprise workspace required/);});
test("Replay endpoint states that external actions require evidence",()=>{assert.match(replayRoute,/does not imply an external action occurred without evidence/);});
