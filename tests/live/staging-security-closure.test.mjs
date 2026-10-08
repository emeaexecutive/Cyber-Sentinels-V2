import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

const stagingProjectRef = "agpyhygpfmppjkxwcpac";
const configuredProjectRef = process.env.STAGING_PROJECT_REF ?? "";
const supabaseUrl = process.env.STAGING_SUPABASE_URL ?? "";
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY ?? "";
const serviceRoleKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "";
const confirmation = process.env.RUN_STAGING_SECURITY_TESTS ?? "";
const appOrigin = process.env.STAGING_APP_ORIGIN;
if (appOrigin !== "https://staging.cybersentinels.com") throw new Error("Set STAGING_APP_ORIGIN to the exact Staging origin for gateway qualification.");

if (confirmation !== "I_CONFIRM_STAGING_MUTATIONS") {
  throw new Error("Set RUN_STAGING_SECURITY_TESTS=I_CONFIRM_STAGING_MUTATIONS to create disposable Staging identities and rows.");
}
if (configuredProjectRef !== stagingProjectRef || new URL(supabaseUrl).host !== `${stagingProjectRef}.supabase.co`) {
  throw new Error("Refusing Staging proof: the explicit project ref and URL must both identify Cyber Sentinels Staging.");
}
if (!anonKey || !serviceRoleKey) throw new Error("Staging anon and service-role keys are required in the process environment.");

const runId = randomUUID();
const trace = [];
const created = { users: [], workspaces: [], teams: [], passports: [], cases: [], reports: [], evidence: [], decisions: [], signals: [], agents: [], apiKeys: [], objects: [] };
const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function makeUserClient(label) {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: {
      fetch: async (input, init) => {
        const response = await globalThis.fetch(input, init);
        const url = new URL(String(input));
        if (url.pathname.startsWith("/storage/v1/")) {
          trace.push({ actor: label, method: init?.method ?? "GET", path: url.pathname, status: response.status, cacheControl:response.headers.get('cache-control'),cacheStatus:response.headers.get('cf-cache-status'),age:response.headers.get('age') });
        }
        return response;
      },
    },
  });
}

async function createFixtureUser(label) {
  const email = `cs-rc-${label}-${runId}@example.test`;
  const password = `${randomBytes(36).toString("base64url")}Aa1!`;
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { organization: `Disposable Staging ${label.toUpperCase()}` },
  });
  if (error || !data.user) throw new Error(`Could not create fixture user ${label}: ${error?.code ?? "UNKNOWN"}`);
  created.users.push(data.user.id);
  const client = makeUserClient(label);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.user || !signedIn.data.session) throw new Error(`Could not authenticate fixture user ${label}: ${signedIn.error?.code ?? "UNKNOWN"}`);
  const jar=[];
  const browserClient=createServerClient(supabaseUrl,anonKey,{cookies:{getAll:()=>jar,setAll:values=>{for(const value of values){const i=jar.findIndex(c=>c.name===value.name);if(i>=0)jar.splice(i,1);jar.push(value);}}}});
  const browserLogin=await browserClient.auth.signInWithPassword({email,password});
  if(browserLogin.error)throw new Error('Staging browser-session fixture failed');
  return { id: data.user.id, email, client, token: signedIn.data.session.access_token, cookies:jar };
}

async function gatewayDownload(user,path) {
  const headers={cookie:user.cookies.map(c=>`${c.name}=${c.value}`).join('; ')};
  if(process.env.VERCEL_OIDC_TOKEN)headers['x-vercel-trusted-oidc-idp-token']=process.env.VERCEL_OIDC_TOKEN;
  return fetch(`${appOrigin}/api/evidence/download?path=${encodeURIComponent(path)}`,{headers,redirect:'manual'});
}

async function insertOne(table, value, createdIds) {
  const { data, error } = await service.from(table).insert(value).select("id").single();
  if (error || !data?.id) throw new Error(`Staging fixture insert failed for ${table}: ${error?.code ?? "UNKNOWN"}`);
  createdIds.push(data.id);
  return data.id;
}

async function directRequest(user, method, table, query, payload) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
    method,
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${user.token}`,
      accept: "application/json",
      "content-type": "application/json",
      prefer: "return=representation",
    },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  return { status: response.status, body, code: body && typeof body === "object" ? body.code ?? null : null };
}

function record(checks, check) {
  checks.push(check);
}

function noRows(checks, tenant, operation, table, response) {
  record(checks, {
    tenant,
    operation,
    table,
    http_status: response.status,
    database_code: response.code,
    expected: "HTTP 200 with zero visible rows",
    actual: Array.isArray(response.body) ? `HTTP ${response.status}, rows=${response.body.length}` : `HTTP ${response.status}, non-row response`,
    result: response.status === 200 && Array.isArray(response.body) && response.body.length === 0 ? "PASS" : "FAIL",
  });
}

function denied(checks, tenant, operation, table, response) {
  record(checks, {
    tenant,
    operation,
    table,
    http_status: response.status,
    database_code: response.code,
    expected: "HTTP 4xx denial",
    actual: `HTTP ${response.status}${response.code ? `, code=${response.code}` : ""}`,
    result: response.status >= 400 && response.status < 500 ? "PASS" : "FAIL",
  });
}

async function serviceRow(table, id, columns = "id") {
  const { data, error } = await service.from(table).select(columns).eq("id", id).maybeSingle();
  if (error) throw new Error(`Service verification failed for ${table}: ${error.code ?? "UNKNOWN"}`);
  return data;
}

async function removeFixtureRows(table, ids) {
  if (!ids.length) return;
  const { error } = await service.from(table).delete().in("id", ids);
  if (error) throw new Error(`Staging fixture cleanup failed for ${table}: ${error.code ?? "UNKNOWN"}`);
}

async function cleanupFixtures() {
  if (created.objects.length) {
    const { error } = await service.storage.from("evidence-files").remove(created.objects);
    if (error) throw new Error(`Staging object cleanup failed: ${error.statusCode ?? error.name ?? "UNKNOWN"}`);
  }
  await removeFixtureRows("decisions", created.decisions);
  await removeFixtureRows("evidence_files", created.evidence);
  await removeFixtureRows("trust_reports", created.reports);
  await removeFixtureRows("verification_cases", created.cases);
  await removeFixtureRows("passports", created.passports);
  await removeFixtureRows("signals", created.signals);
  await removeFixtureRows("ai_agents", created.agents);
  await removeFixtureRows("api_keys", created.apiKeys);
  if (created.teams.length) {
    const { error: membershipError } = await service.from("team_members").delete().in("team_id", created.teams);
    if (membershipError) throw new Error(`Staging team membership cleanup failed: ${membershipError.code ?? "UNKNOWN"}`);
  }
  await removeFixtureRows("teams", created.teams);
  await removeFixtureRows("trust_workspaces", created.workspaces);
  for (const userId of created.users) {
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Staging Auth fixture cleanup failed: ${error.code ?? "UNKNOWN"}`);
  }
}

async function approveUser(userId, approverId, status) {
  const now = new Date().toISOString();
  const values = { status, reason: `Disposable Staging security proof ${runId}` };
  if (status === "APPROVED") Object.assign(values, { approved_at: now, approved_by: approverId });
  if (status === "DENIED") Object.assign(values, { denied_at: now, denied_by: approverId });
  if (status === "SUSPENDED") Object.assign(values, { suspended_at: now, suspended_by: approverId });
  if (status === "REVOKED") Object.assign(values, { revoked_at: now, revoked_by: approverId });
  const { error } = await service.from("account_access_approvals").update(values).eq("user_id", userId);
  if (error) throw new Error(`Staging approval transition failed: ${error.code ?? "UNKNOWN"}`);
}

async function storageCheck(checks, tenant, operation, expected, invoke, accepted) {
  const firstTrace = trace.length;
  const result = await invoke();
  const calls = trace.slice(firstTrace);
  const status = calls.at(-1)?.status ?? null;
  const errorStatus = result.error?.statusCode ?? null;
  const outcome = await accepted(result, status);
  record(checks, {
    tenant,
    operation,
    table: "storage.objects/evidence-files",
    http_status: status,
    storage_error_status: errorStatus,
    expected,
    actual: result.error ? `DENIED ${errorStatus ?? result.error.name ?? "ERROR"}` : `SUCCESS${Array.isArray(result.data) ? ` rows=${result.data.length}` : ""}`,
    result: outcome ? "PASS" : "FAIL",
  });
  return result;
}

test("Staging Auth, PostgREST tenant RLS, account approval and evidence Storage isolation", async (t) => {
  t.after(cleanupFixtures);
  // Fresh run: cleanup only identities and objects created by this invocation.
  const checks = [];
  const suffix = runId.slice(0, 8);
  const admin = await createFixtureUser(`admin-${suffix}`);
  const tenantA = await createFixtureUser(`tenant-a-${suffix}`);
  const tenantB = await createFixtureUser(`tenant-b-${suffix}`);

  async function createWorkspace(label, owner) {
    const { data, error } = await service.from("trust_workspaces").insert({
      name: `Disposable RC ${label.toUpperCase()} ${suffix}`,
      slug: `rc-${label}-${suffix}`,
      description: `Disposable Staging security qualification ${runId}`,
      created_by: owner.id,
    }).select("id").single();
    if (error || !data?.id) throw new Error(`Workspace fixture failed: ${error?.code ?? "UNKNOWN"}`);
    created.workspaces.push(data.id);
    return data.id;
  }

  const workspaceA = await createWorkspace("a", tenantA);
  const workspaceB = await createWorkspace("b", tenantB);
  const teamA = randomUUID();
  const teamB = randomUUID();
  const teamAInsert = await service.from("teams").insert({ id: teamA, team_name: `RC Tenant A ${suffix}`, name: `RC Tenant A ${suffix}`, owner_email: tenantA.email });
  const teamBInsert = await service.from("teams").insert({ id: teamB, team_name: `RC Tenant B ${suffix}`, name: `RC Tenant B ${suffix}`, owner_email: tenantB.email });
  if (teamAInsert.error || teamBInsert.error) throw new Error(`Team fixture failed: ${teamAInsert.error?.code ?? teamBInsert.error?.code ?? "UNKNOWN"}`);
  created.teams.push(teamA, teamB);
  const memberA = await service.from("team_members").insert({ team_id: teamA, member_email: tenantA.email, role: "owner", invitation_status: "active" });
  const memberB = await service.from("team_members").insert({ team_id: teamB, member_email: tenantB.email, role: "owner", invitation_status: "active" });
  if (memberA.error || memberB.error) throw new Error(`Team member fixture failed: ${memberA.error?.code ?? memberB.error?.code ?? "UNKNOWN"}`);

  const passportA = await insertOne("passports", { subject_type: "human", subject_name: "Disposable Tenant A subject", owner_email: tenantA.email, user_email: tenantA.email, team_id: teamA, trust_score: 50 }, created.passports);
  const passportB = await insertOne("passports", { subject_type: "human", subject_name: "Disposable Tenant B subject", owner_email: tenantB.email, user_email: tenantB.email, team_id: teamB, trust_score: 50 }, created.passports);
  const caseA = await insertOne("verification_cases", { passport_id: passportA, subject_type: "human", subject_name: "Disposable Tenant A case", owner_email: tenantA.email, team_id: teamA, status: "pending", verification_status: "pending" }, created.cases);
  const caseB = await insertOne("verification_cases", { passport_id: passportB, subject_type: "human", subject_name: "Disposable Tenant B case", owner_email: tenantB.email, team_id: teamB, status: "pending", verification_status: "pending" }, created.cases);
  const reportA = await insertOne("trust_reports", { passport_id: passportA, owner_email: tenantA.email, team_id: teamA, profile_consistency: 50, synthetic_risk: 10, confidence: 70, trust_score: 50 }, created.reports);
  const reportB = await insertOne("trust_reports", { passport_id: passportB, owner_email: tenantB.email, team_id: teamB, profile_consistency: 50, synthetic_risk: 10, confidence: 70, trust_score: 50 }, created.reports);
  const evidenceA = await insertOne("evidence_files", { verification_case_id: caseA, passport_id: passportA, owner_email: tenantA.email, team_id: teamA, uploaded_by: tenantA.email, file_name: `rc-a-${suffix}.pdf`, file_url: null, media_type: "document", evidence_type: "PDF", storage_path: `${caseA}/tenant-a.pdf` }, created.evidence);
  const evidenceB = await insertOne("evidence_files", { verification_case_id: caseB, passport_id: passportB, owner_email: tenantB.email, team_id: teamB, uploaded_by: tenantB.email, file_name: `rc-b-${suffix}.pdf`, file_url: null, media_type: "document", evidence_type: "PDF", storage_path: `${caseB}/tenant-b.pdf` }, created.evidence);
  const decisionA = await insertOne("decisions", { verification_case_id: caseA, case_id: caseA, passport_id: passportA, owner_email: tenantA.email, team_id: teamA, decision: "manual_review", status: "pending", actor: "Staging proof" }, created.decisions);
  const decisionB = await insertOne("decisions", { verification_case_id: caseB, case_id: caseB, passport_id: passportB, owner_email: tenantB.email, team_id: teamB, decision: "manual_review", status: "pending", actor: "Staging proof" }, created.decisions);
  const signalA = await insertOne("signals", { event: `rc-tenant-a-${suffix}`, owner_email: tenantA.email, team_id: teamA, metadata: { run_id: runId } }, created.signals);
  const signalB = await insertOne("signals", { event: `rc-tenant-b-${suffix}`, owner_email: tenantB.email, team_id: teamB, metadata: { run_id: runId } }, created.signals);
  const agentA = await insertOne("ai_agents", { agent_name: `Disposable Agent A ${suffix}`, owner_user_id: tenantA.id, owner_email: tenantA.email, owner_enterprise_id: workspaceA, enterprise_id: workspaceA, status: "pending" }, created.agents);
  const agentB = await insertOne("ai_agents", { agent_name: `Disposable Agent B ${suffix}`, owner_user_id: tenantB.id, owner_email: tenantB.email, owner_enterprise_id: workspaceB, enterprise_id: workspaceB, status: "pending" }, created.agents);
  const apiKeyA = await insertOne("api_keys", { owner_user_id: tenantA.id, user_id: tenantA.id, user_email: tenantA.email, tenant_id: workspaceA, client_id: randomUUID(), key_hash: "staging-qualification-invalid-hash", key_prefix: `rca_${suffix}`, label: "Disposable non-authenticating RLS fixture", status: "active", scopes: ["trust:read"] }, created.apiKeys);
  const apiKeyB = await insertOne("api_keys", { owner_user_id: tenantB.id, user_id: tenantB.id, user_email: tenantB.email, tenant_id: workspaceB, client_id: randomUUID(), key_hash: "staging-qualification-invalid-hash", key_prefix: `rcb_${suffix}`, label: "Disposable non-authenticating RLS fixture", status: "active", scopes: ["trust:read"] }, created.apiKeys);
  const objectA = `${caseA}/tenant-a-${suffix}.pdf`;
  const objectB = `${caseB}/tenant-b-${suffix}.pdf`;
  for (const [path, text] of [[objectA, "Tenant A staging evidence fixture"], [objectB, "Tenant B staging evidence fixture"]]) {
    const { error } = await service.storage.from("evidence-files").upload(path, Buffer.from(text), { contentType: "application/pdf", cacheControl: "3600", upsert: false });
    if (error) throw new Error(`Storage fixture upload failed: ${error.statusCode ?? error.name ?? "UNKNOWN"}`);
    created.objects.push(path);
  }

  const pendingReadA = await directRequest(tenantA, "GET", "account_access_approvals", `select=user_id,status&user_id=eq.${tenantA.id}`);
  record(checks, { tenant: "A", operation: "read own approval", table: "account_access_approvals", http_status: pendingReadA.status, expected: "PENDING", actual: pendingReadA.body?.[0]?.status ?? "NOT_FOUND", result: pendingReadA.status === 200 && pendingReadA.body?.[0]?.status === "PENDING" ? "PASS" : "FAIL" });
  const visibleApprovals = await directRequest(tenantA, "GET", "account_access_approvals", "select=user_id,status");
  record(checks, { tenant: "A", operation: "list approvals", table: "account_access_approvals", http_status: visibleApprovals.status, expected: "only Tenant A own row", actual: `rows=${Array.isArray(visibleApprovals.body) ? visibleApprovals.body.length : "denied"}; own=${Array.isArray(visibleApprovals.body) && visibleApprovals.body.length === 1 && visibleApprovals.body[0].user_id === tenantA.id}`, result: visibleApprovals.status === 200 && visibleApprovals.body?.length === 1 && visibleApprovals.body[0].user_id === tenantA.id ? "PASS" : "FAIL" });
  denied(checks, "A", "read approval audit events", "account_access_approval_events", await directRequest(tenantA, "GET", "account_access_approval_events", "select=id,user_id,event_type"));
  denied(checks, "A", "mutate own approval", "account_access_approvals", await directRequest(tenantA, "PATCH", "account_access_approvals", `user_id=eq.${tenantA.id}`, { status: "APPROVED" }));
  const pendingPassportRead = await directRequest(tenantA, "GET", "passports", `select=id&id=eq.${passportA}`);
  noRows(checks, "A/PENDING", "SELECT own protected row", "passports", pendingPassportRead);
  const pendingPassportWrite = await directRequest(tenantA, "POST", "passports", "select=id", { subject_type: "human", subject_name: "Pending user write" });
  denied(checks, "A/PENDING", "INSERT protected row", "passports", pendingPassportWrite);
  const pendingRpc = await tenantA.client.rpc("record_account_access_attempt", { p_access_granted: false });
  record(checks, { tenant: "A/PENDING", operation: "record blocked login", table: "account_access_approval_events", http_status: pendingRpc.error?.status ?? 200, expected: "RPC records blocked attempt", actual: pendingRpc.error ? `ERROR ${pendingRpc.error.code ?? "UNKNOWN"}` : "RECORDED", result: pendingRpc.error ? "FAIL" : "PASS" });

  const approvedAt = new Date().toISOString();
  for (const user of [tenantA, tenantB]) {
    const { error } = await service.from("account_access_approvals").update({ status: "APPROVED", approved_at: approvedAt, approved_by: admin.id, reason: `Disposable Staging proof ${runId}` }).eq("user_id", user.id);
    if (error) throw new Error(`Staging approval failed: ${error.code ?? "UNKNOWN"}`);
    const rpc = await user.client.rpc("record_account_access_attempt", { p_access_granted: true });
    if (rpc.error) throw new Error(`Approved login audit RPC failed: ${rpc.error.code ?? "UNKNOWN"}`);
  }

  const pairs = [
    { a: tenantA, b: tenantB, row: { workspaceA, workspaceB, teamA, teamB, passportA, passportB, caseA, caseB, reportA, reportB, evidenceA, evidenceB, decisionA, decisionB, signalA, signalB, agentA, agentB, apiKeyA, apiKeyB, objectA, objectB } },
    { a: tenantB, b: tenantA, row: { workspaceA, workspaceB, teamA, teamB, passportA, passportB, caseA, caseB, reportA, reportB, evidenceA, evidenceB, decisionA, decisionB, signalA, signalB, agentA, agentB, apiKeyA, apiKeyB, objectA, objectB } },
  ];

  for (const pair of pairs) {
    const label = pair.a === tenantA ? "A" : "B";
    const target = pair.a === tenantA ? "B" : "A";
    const ids = pair.row;
    const crossRows = [
      ["passports", target === "A" ? ids.passportA : ids.passportB],
      ["verification_cases", target === "A" ? ids.caseA : ids.caseB],
      ["trust_reports", target === "A" ? ids.reportA : ids.reportB],
      ["evidence_files", target === "A" ? ids.evidenceA : ids.evidenceB],
      ["decisions", target === "A" ? ids.decisionA : ids.decisionB],
      ["signals", target === "A" ? ids.signalA : ids.signalB],
      ["ai_agents", target === "A" ? ids.agentA : ids.agentB],
      ["api_keys", target === "A" ? ids.apiKeyA : ids.apiKeyB],
    ];
    for (const [table, id] of crossRows) noRows(checks, `${label}->${target}`, "SELECT", table, await directRequest(pair.a, "GET", table, `select=id&id=eq.${id}`));
    const ownPassport = label === "A" ? ids.passportA : ids.passportB;
    denied(checks, label, "UPDATE own passport to verified", "passports", await directRequest(pair.a, "PATCH", "passports", `id=eq.${ownPassport}&select=id`, { verified: true, clearance: "approved", review_status: "verified", trust_score: 100 }));
    const passportState = await serviceRow("passports", ownPassport, "id,verified,clearance,review_status,trust_score");
    record(checks, { tenant: label, operation: "verify own passport unchanged", table: "passports", expected: "not verified by customer", actual: `${passportState?.verified}/${passportState?.clearance}/${passportState?.review_status}/${passportState?.trust_score}`, result: passportState && passportState.verified !== true && passportState.clearance !== "approved" && passportState.review_status !== "verified" && passportState.trust_score !== 100 ? "PASS" : "FAIL" });

    const foreignTeam = target === "A" ? ids.teamA : ids.teamB;
    const foreignPassport = target === "A" ? ids.passportA : ids.passportB;
    const foreignCase = target === "A" ? ids.caseA : ids.caseB;
    const forgedWrites = [
      ["passports", { subject_type: "human", subject_name: "Cross-team insertion", owner_email: pair.a.email, user_email: pair.a.email, team_id: foreignTeam }],
      ["trust_reports", { profile_consistency: 50, synthetic_risk: 10, confidence: 70, trust_score: 50, owner_email: pair.a.email, passport_id: foreignPassport }],
      ["verification_cases", { owner_email: pair.a.email, passport_id: foreignPassport, subject_type: "human", subject_name: "Cross-passport case" }],
      ["evidence_files", { owner_email: pair.a.email, uploaded_by: pair.a.email, verification_case_id: foreignCase, passport_id: foreignPassport, file_name: "cross-tenant.pdf" }],
      ["decisions", { owner_email: pair.a.email, verification_case_id: foreignCase, decision: "manual_review", status: "pending" }],
      ["signals", { owner_email: pair.a.email, team_id: foreignTeam, event: "cross-tenant signal" }],
      ["ai_agents", { agent_name: "Cross-tenant agent", owner_user_id: pair.a.id, owner_email: pair.a.email, enterprise_id: target === "A" ? ids.workspaceA : ids.workspaceB, owner_enterprise_id: target === "A" ? ids.workspaceA : ids.workspaceB }],
    ];
    for (const [table, body] of forgedWrites) denied(checks, `${label}->${target}`, "INSERT foreign parent/team/tenant", table, await directRequest(pair.a, "POST", table, "select=id", body));

    const foreignReport = target === "A" ? ids.reportA : ids.reportB;
    const updateResponse = await directRequest(pair.a, "PATCH", "trust_reports", `id=eq.${foreignReport}&select=id`, { review_status: `tampered-by-${label}` });
    const updateRows = Array.isArray(updateResponse.body) ? updateResponse.body.length : 0;
    record(checks, { tenant: `${label}->${target}`, operation: "UPDATE foreign report", table: "trust_reports", http_status: updateResponse.status, database_code: updateResponse.code, expected: "zero affected rows", actual: `rows=${updateRows}`, result: updateResponse.status === 200 && updateRows === 0 ? "PASS" : "FAIL" });
    const foreignPassportId = target === "A" ? ids.passportA : ids.passportB;
    const deleteResponse = await directRequest(pair.a, "DELETE", "passports", `id=eq.${foreignPassportId}&select=id`);
    const deletedRows = Array.isArray(deleteResponse.body) ? deleteResponse.body.length : 0;
    const stillPresent = await serviceRow("passports", foreignPassportId, "id");
    const deleteDenied = deleteResponse.status >= 400 && deleteResponse.status < 500;
    record(checks, { tenant: `${label}->${target}`, operation: "DELETE foreign passport", table: "passports", http_status: deleteResponse.status, database_code: deleteResponse.code, expected: "ACL/RLS denial or zero deleted; row remains", actual: stillPresent ? `rows=${deletedRows},present=yes` : "row missing", result: stillPresent && (deleteDenied || ((deleteResponse.status === 200 || deleteResponse.status === 204) && deletedRows === 0)) ? "PASS" : "FAIL" });
  }

  const storagePairs = [
    { user: tenantA, label: "A", ownPath: objectA, ownCase: caseA, foreignPath: objectB, foreignCase: caseB },
    { user: tenantB, label: "B", ownPath: objectB, ownCase: caseB, foreignPath: objectA, foreignCase: caseA },
  ];
  for (const pair of storagePairs) {
    const bucket = pair.user.client.storage.from("evidence-files");
    await storageCheck(checks, pair.label, "LIST own prefix", "one own object", () => bucket.list(pair.ownCase), (result) => !result.error && result.data?.some((item) => item.name === pair.ownPath.split("/").at(-1)));
    await storageCheck(checks, pair.label, "READ own object directly", "gateway required", () => bucket.download(pair.ownPath), (result) => Boolean(result.error));
    await storageCheck(checks, pair.label, "CREATE SIGNED URL own object", "gateway required", () => bucket.createSignedUrl(pair.ownPath, 60), (result) => Boolean(result.error));
    await storageCheck(checks, pair.label, "LIST foreign prefix", "zero visible objects", () => bucket.list(pair.foreignCase), (result) => !result.error && (result.data?.length ?? 0) === 0);
    await storageCheck(checks, pair.label, "READ foreign object", "download denied", () => bucket.download(pair.foreignPath), (result) => Boolean(result.error));
    await storageCheck(checks, pair.label, "CREATE SIGNED URL foreign object", "signed URL denied", () => bucket.createSignedUrl(pair.foreignPath, 60), (result) => Boolean(result.error));
    await storageCheck(checks, pair.label, "UPLOAD into foreign prefix", "upload denied", () => bucket.upload(`${pair.foreignCase}/forged-${suffix}.pdf`, Buffer.from("forged tenant upload"), { contentType: "application/pdf", cacheControl: "3600", upsert: false }), (result) => Boolean(result.error));
    await storageCheck(checks, pair.label, "REPLACE foreign object", "replace denied", () => bucket.upload(pair.foreignPath, Buffer.from("forged replace"), { contentType: "application/pdf", upsert: true }), (result) => Boolean(result.error));
    await storageCheck(checks, pair.label, "DELETE foreign object", "object remains after denied/empty delete", () => bucket.remove([pair.foreignPath]), async (result) => {
      const preserved = await service.storage.from("evidence-files").download(pair.foreignPath);
      return Boolean(preserved.data) && (!result.error || (result.data?.length ?? 0) === 0);
    });
    assert.ok(trace.some((entry) => entry.path.includes("/storage/v1/")), "expected a real Storage API request");
    const ownUpload = `${pair.ownCase}/same-tenant-${suffix}.pdf`;
    await storageCheck(checks, pair.label, "UPLOAD own prefix", "same-tenant upload succeeds", () => bucket.upload(ownUpload, Buffer.from("same tenant upload"), { contentType: "application/pdf", cacheControl: "3600", upsert: false }), (result) => !result.error && Boolean(result.data?.path));
    await storageCheck(checks, pair.label, "REPLACE own object", "same-tenant replace succeeds", () => bucket.upload(ownUpload, Buffer.from("same tenant replacement"), { contentType: "application/pdf", upsert: true }), (result) => !result.error && Boolean(result.data?.path));
    await storageCheck(checks, pair.label, "DELETE own object", "same-tenant delete succeeds", () => bucket.remove([ownUpload]), (result) => !result.error && (result.data?.length ?? 0) === 1);
    const serviceDownload = await service.storage.from("evidence-files").download(pair.foreignPath);
    record(checks, { tenant: pair.label, operation: "service-role READ foreign object", table: "storage.objects/evidence-files", expected: "trusted service role succeeds", actual: serviceDownload.error ? `ERROR ${serviceDownload.error.statusCode ?? serviceDownload.error.name}` : "SUCCESS", result: serviceDownload.data ? "PASS" : "FAIL" });
  }

  const statuses = ["PENDING", "DENIED", "APPROVED", "SUSPENDED", "APPROVED", "REVOKED"];
  for (const status of statuses) {
    await approveUser(tenantA.id, admin.id, status);
    const response = await directRequest(tenantA, "GET", "passports", `select=id&id=eq.${passportA}`);
    const visible = Array.isArray(response.body) ? response.body.length : 0;
    const shouldAllow = status === "APPROVED";
    const gateway=await gatewayDownload(tenantA,objectA);
    const gatewayBody=await gateway.text();
    const gatewayAllowed=gateway.status===200&&gatewayBody.length>0&&/no-store/.test(gateway.headers.get('cache-control')??'');
    record(checks,{tenant:status,operation:'approval-revalidated gateway download',table:'storage.objects/evidence-files',http_status:gateway.status,expected:shouldAllow?'private no-store bytes':'403 approval denial',actual:String(gateway.status),result:(shouldAllow?gatewayAllowed:gateway.status===403)?'PASS':'FAIL'});
    const foreignGateway=await gatewayDownload(tenantB,objectA);
    record(checks,{tenant:'B',operation:'foreign gateway download',table:'storage.objects/evidence-files',http_status:foreignGateway.status,expected:'404 tenant denial',actual:String(foreignGateway.status),result:foreignGateway.status===404?'PASS':'FAIL'});
    for(const route of ['object','object/authenticated']){
      const endpoint=`${supabaseUrl}/storage/v1/${route}/evidence-files/${objectA}?cacheNonce=${runId}-${status}`;
      const response=await fetch(endpoint,{headers:{apikey:anonKey,authorization:`Bearer ${tenantA.token}`}});
      record(checks,{tenant:status,operation:`fresh ${route} download`,table:'storage.objects/evidence-files',http_status:response.status,cacheStatus:response.headers.get('cf-cache-status'),expected:'gateway required',actual:String(response.status),result:response.status>=400?'PASS':'FAIL'});
      await response.arrayBuffer();
    }
    const bucket=tenantA.client.storage.from('evidence-files');
    if(!shouldAllow){
      await storageCheck(checks,status,'LIST own prefix blocked','zero objects',()=>bucket.list(caseA),r=>!r.error&&r.data.length===0);
      await storageCheck(checks,status,'DOWNLOAD own object blocked','denied',()=>bucket.download(objectA),r=>Boolean(r.error));
      await storageCheck(checks,status,'SIGNED URL blocked','denied',()=>bucket.createSignedUrl(objectA,60),r=>Boolean(r.error));
      const attempted=caseA+'/blocked-'+status+'-'+suffix+'.pdf';created.objects.push(attempted);
      await storageCheck(checks,status,'UPLOAD own prefix blocked','denied',()=>bucket.upload(attempted,Buffer.from('denied'),{contentType:'application/pdf'}),r=>Boolean(r.error));
      await storageCheck(checks,status,'REPLACE own object blocked','denied',()=>bucket.update(objectA,Buffer.from('denied'),{contentType:'application/pdf'}),r=>Boolean(r.error));
      await storageCheck(checks,status,'DELETE own object blocked','preserved',()=>bucket.remove([objectA]),async r=>{const p=await service.storage.from('evidence-files').download(objectA);return !p.error&&Boolean(r.error||r.data.length===0);});
    }
    record(checks, { tenant: `A/${status}`, operation: "protected PostgREST SELECT", table: "passports", http_status: response.status, expected: shouldAllow ? "one own row" : "zero rows", actual: `rows=${visible}`, result: response.status === 200 && visible === (shouldAllow ? 1 : 0) ? "PASS" : "FAIL" });
  }
  const { data: events, error: eventsError } = await service.from("account_access_approval_events").select("event_type").eq("user_id", tenantA.id);
  if (eventsError) throw new Error(`Approval event query failed: ${eventsError.code ?? "UNKNOWN"}`);
  for (const eventType of ["ACCESS_REQUESTED", "ACCESS_APPROVED", "ACCESS_DENIED", "ACCESS_SUSPENDED", "ACCESS_REVOKED", "BLOCKED_LOGIN_ATTEMPT", "SUCCESSFUL_APPROVED_LOGIN"]) {
    const count = (events ?? []).filter((event) => event.event_type === eventType).length;
    record(checks, { tenant: "A", operation: `audit ${eventType}`, table: "account_access_approval_events", expected: "one or more events", actual: `count=${count}`, result: count > 0 ? "PASS" : "FAIL" });
  }

  const report = {
    proof: "STAGING_DIRECT_POSTGREST_AND_STORAGE",
    generatedAt: new Date().toISOString(),
    stagingProjectRef,
    runId,
    tenantA: { userId: tenantA.id, workspaceId: workspaceA, teamId: teamA, passportId: passportA, caseId: caseA },
    tenantB: { userId: tenantB.id, workspaceId: workspaceB, teamId: teamB, passportId: passportB, caseId: caseB },
    platformAdminFixtureUserId: admin.id,
    checks,
    storageTrace: trace,
    created,
    note: "Synthetic example.test identities and disposable staging rows only; no credential, review content, or customer data included.",
  };
  console.log(JSON.stringify(report));
  assert.ok(checks.every((check) => check.result === "PASS"), `${checks.filter((check) => check.result !== "PASS").length} live Staging checks failed; see sanitized matrix above.`);
});
