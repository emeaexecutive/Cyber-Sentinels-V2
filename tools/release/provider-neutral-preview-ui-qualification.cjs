/* eslint-disable @typescript-eslint/no-require-imports */
const { randomBytes } = require("node:crypto");
const { spawn } = require("node:child_process");
const { createServerClient } = require("@supabase/ssr");
const { createClient } = require("@supabase/supabase-js");

const required = [
  "PROVIDER_NEUTRAL_PREVIEW_URL",
  "PROVIDER_NEUTRAL_PREVIEW_ANON_KEY",
  "PROVIDER_NEUTRAL_PREVIEW_SERVICE_KEY",
  "PROVIDER_NEUTRAL_PREVIEW_TENANT_ID",
  "PROVIDER_NEUTRAL_PREVIEW_ENTITY_ID",
];
for (const name of required) if (!process.env[name]) throw new Error(`${name} is required.`);

const previewUrl = process.env.PROVIDER_NEUTRAL_PREVIEW_URL;
const anonKey = process.env.PROVIDER_NEUTRAL_PREVIEW_ANON_KEY;
const serviceKey = process.env.PROVIDER_NEUTRAL_PREVIEW_SERVICE_KEY;
const tenantId = process.env.PROVIDER_NEUTRAL_PREVIEW_TENANT_ID;
const entityId = process.env.PROVIDER_NEUTRAL_PREVIEW_ENTITY_ID;
const port = process.env.PROVIDER_NEUTRAL_PREVIEW_UI_PORT ?? "3120";
const origin = `http://127.0.0.1:${port}`;
const admin = createClient(previewUrl, serviceKey, { auth: { persistSession: false } });
const cookies = [];
let userId;
let server;
let serverLog = "";
const heartbeat = setInterval(() => console.error("PREVIEW_UI_QUALIFICATION_RUNNING"), 15_000);

function assert(condition, message) {
  if (!condition) throw new Error(`ASSERTION_FAILED:${message}`);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      const response = await fetch(`${origin}/login`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Local production server did not become ready.");
}

async function main() {
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) throw existing.error;
  for (const user of existing.data.users.filter((candidate) => candidate.email?.startsWith("provider-neutral-qualification-"))) {
    await admin.from("workspace_members").delete().eq("workspace_id", tenantId).eq("user_id", user.id);
    await admin.auth.admin.deleteUser(user.id);
  }
  const suffix = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const email = `provider-neutral-qualification-${suffix}@example.invalid`;
  const password = randomBytes(24).toString("base64url");
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw created.error ?? new Error("Auth user unavailable.");
  userId = created.data.user.id;
  const membership = await admin.from("workspace_members").insert({ workspace_id: tenantId, user_id: userId, role: "observer" });
  if (membership.error) throw membership.error;

  const auth = createServerClient(previewUrl, anonKey, {
    cookies: {
      getAll: () => cookies,
      setAll: (updates) => {
        for (const update of updates) {
          const index = cookies.findIndex((item) => item.name === update.name);
          if (index >= 0) cookies[index] = update;
          else cookies.push(update);
        }
      },
    },
  });
  const signedIn = await auth.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Session unavailable.");
  const directEntities = await auth.from("operational_entities").select("entity_id");
  if (directEntities.error) throw directEntities.error;
  assert(directEntities.data.some((row) => row.entity_id === entityId), "authenticated RLS query sees live entity");

  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", port], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "development",
      NEXT_PUBLIC_SUPABASE_URL: previewUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
      SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  const capture = (chunk) => { serverLog = `${serverLog}${chunk}`.slice(-8000); };
  server.stdout.on("data", capture);
  server.stderr.on("data", capture);
  await waitForServer();
  const cookieHeader = cookies.map((item) => `${item.name}=${item.value}`).join("; ");
  const listResponse = await fetch(`${origin}/operational-entities`, { headers: { cookie: cookieHeader }, redirect: "manual" });
  const listHtml = await listResponse.text();
  assert(listResponse.status === 200, `list status ${listResponse.status}`);
  if (!listHtml.includes(entityId)) {
    const title = listHtml.match(/<title>([^<]*)<\/title>/i)?.[1] ?? "missing";
    console.error(JSON.stringify({ listLength: listHtml.length, cookieCount: cookies.length, title, hasOperationalHeading: listHtml.includes("Operational entities"), hasEmptyState: listHtml.includes("No governed Operational Entities"), hasSignIn: listHtml.includes("Sign in"), hasProtectedUnavailable: listHtml.includes("Protected surface unavailable") }));
    console.error(serverLog.replaceAll(previewUrl, "[REDACTED_PREVIEW_URL]").replaceAll(anonKey, "[REDACTED]").replaceAll(serviceKey, "[REDACTED]").slice(-2000));
  }
  assert(listHtml.includes(entityId), "list renders live entity reference");
  assert(!listHtml.includes("Controlled CPTO qualification"), "list contains no hard-coded demo panel");

  const detailResponse = await fetch(`${origin}/operational-entities/${encodeURIComponent(entityId)}`, { headers: { cookie: cookieHeader }, redirect: "manual" });
  const detailHtml = await detailResponse.text();
  assert(detailResponse.status === 200, `detail status ${detailResponse.status}`);
  for (const expected of [
    entityId,
    "qual-provider-a-",
    "qual-provider-b-",
    "Control Owner",
    "Evidence Independence",
    "Provider History",
    "Migration Gap",
    "Replay",
    "Trust Memory",
  ]) assert(detailHtml.includes(expected), `detail renders ${expected}`);

  console.log(JSON.stringify({ status: "PASS", listStatus: listResponse.status, detailStatus: detailResponse.status, entityId, liveProviderRows: 2, hardCodedDemoState: false }));
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    clearInterval(heartbeat);
    if (server) server.kill();
    if (userId) {
      await admin.from("workspace_members").delete().eq("workspace_id", tenantId).eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });
