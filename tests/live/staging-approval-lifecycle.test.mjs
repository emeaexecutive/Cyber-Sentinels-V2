import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const stagingProjectRef = "agpyhygpfmppjkxwcpac";
const supabaseUrl = process.env.STAGING_SUPABASE_URL ?? "";
const anonKey = process.env.STAGING_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY ?? "";
if (process.env.RUN_STAGING_SECURITY_TESTS !== "I_CONFIRM_STAGING_MUTATIONS") throw new Error("Set RUN_STAGING_SECURITY_TESTS=I_CONFIRM_STAGING_MUTATIONS to create disposable Staging identities.");
if (process.env.STAGING_PROJECT_REF !== stagingProjectRef || new URL(supabaseUrl).host !== `${stagingProjectRef}.supabase.co`) throw new Error("Refusing: project ref and URL must both identify Cyber Sentinels Staging.");
if (!anonKey || !serviceKey) throw new Error("Staging anon and service-role keys are required in the process environment.");

const runId = randomUUID();
const opts = { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } };
const service = createClient(supabaseUrl, serviceKey, opts);
const users = new Map();
const workspaces = [];
const results = [];
const record = (check, pass) => { results.push({ check, pass }); assert.ok(pass, check); };

async function fixtureUser(label) {
  const email = `cs-approval-${label}-${runId}@example.test`;
  const password = `${randomBytes(36).toString("base64url")}Aa1!`;
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error || !created.data.user) throw new Error(`fixture ${label} failed`);
  const client = createClient(supabaseUrl, anonKey, opts);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw new Error(`fixture ${label} sign-in failed`);
  const user = { id: created.data.user.id, client };
  users.set(label, user);
  return user;
}
async function setStatus(user, status, actor) {
  const now = new Date().toISOString();
  const column = { APPROVED: "approved", REJECTED: "rejected", SUSPENDED: "suspended", REVOKED: "revoked" }[status];
  const patch = { status, reason: "disposable staging qualification" };
  if (column) { patch[`${column}_at`] = now; patch[`${column}_by`] = actor.id; }
  const { error } = await service.from("account_access_approvals").update(patch).eq("user_id", user.id);
  if (error) throw new Error(`status change to ${status} failed: ${error.code}`);
}
const createWorkspace = async (user) => {
  const { data, error } = await user.client.from("trust_workspaces").insert({ name: `approval-${runId}`, created_by: user.id }).select("id").maybeSingle();
  if (data?.id) workspaces.push(data.id);
  return { data, error };
};
const ownStatus = async (user) => (await user.client.from("account_access_approvals").select("status").eq("user_id", user.id).maybeSingle()).data?.status;

test("hosted Staging account-approval lifecycle, session revocation, audit immutability and erasure", async (t) => {
  t.after(async () => {
    for (const id of workspaces) await service.from("trust_workspaces").delete().eq("id", id);
    for (const user of users.values()) await service.auth.admin.deleteUser(user.id).catch(() => undefined);
    console.log(JSON.stringify({ project: stagingProjectRef, checks: results.length, passed: results.filter((r) => r.pass).length, failed: results.filter((r) => !r.pass).map((r) => r.check) }));
  });
  const admin = await fixtureUser("admin");
  const pending = await fixtureUser("pending");
  const approved = await fixtureUser("approved");
  const other = await fixtureUser("other");
  const rejected = await fixtureUser("rejected");
  const suspended = await fixtureUser("suspended");
  const revoked = await fixtureUser("revoked");
  await setStatus(approved, "APPROVED", admin);
  await setStatus(other, "APPROVED", admin);
  await setStatus(rejected, "REJECTED", admin);
  await setStatus(suspended, "SUSPENDED", admin);
  await setStatus(revoked, "REVOKED", admin);

  await t.test("new accounts default to PENDING and each state is visible only as its own status", async () => {
    record("new account defaults to PENDING", await ownStatus(pending) === "PENDING");
    for (const [label, expected] of [["approved", "APPROVED"], ["rejected", "REJECTED"], ["suspended", "SUSPENDED"], ["revoked", "REVOKED"]]) record(`${label} status is ${expected}`, await ownStatus(users.get(label)) === expected);
    const others = await approved.client.from("account_access_approvals").select("status").eq("user_id", pending.id);
    record("a user cannot read another user's approval", (others.data ?? []).length === 0);
  });

  await t.test("only APPROVED accounts can use tenant data", async () => {
    const ok = await createWorkspace(approved);
    record("APPROVED creates a workspace", Boolean(ok.data?.id) && !ok.error);
    for (const label of ["pending", "rejected", "suspended", "revoked"]) {
      const denied = await createWorkspace(users.get(label));
      record(`${label} is denied tenant writes`, !denied.data?.id && Boolean(denied.error));
    }
    const readDenied = await pending.client.from("trust_workspaces").select("id").limit(5);
    record("PENDING reads zero tenant rows", (readDenied.data ?? []).length === 0);
  });

  await t.test("login-attempt RPC refuses an access grant to a non-approved account", async () => {
    const granted = await pending.client.rpc("record_account_access_attempt", { p_access_granted: true });
    record("PENDING cannot record a granted login", Boolean(granted.error));
    const blocked = await pending.client.rpc("record_account_access_attempt", { p_access_granted: false });
    record("PENDING can record a blocked attempt", !blocked.error);
    const good = await approved.client.rpc("record_account_access_attempt", { p_access_granted: true });
    record("APPROVED can record a granted login", !good.error);
    const events = await service.from("account_access_approval_events").select("event_type").eq("user_id", pending.id).eq("event_type", "BLOCKED_LOGIN_ATTEMPT");
    record("blocked attempt is audited", (events.data ?? []).length === 1);
  });

  await t.test("self-approval and direct approval writes are impossible for customers", async () => {
    const update = await pending.client.from("account_access_approvals").update({ status: "APPROVED", approved_by: pending.id }).eq("user_id", pending.id).select("status");
    record("self-update is denied", Boolean(update.error) || (update.data ?? []).length === 0);
    record("status unchanged after self-approval attempt", await ownStatus(pending) === "PENDING");
    const insert = await pending.client.from("account_access_approvals").insert({ user_id: randomUUID(), email: "x@example.test", status: "APPROVED" });
    record("customer insert is denied", Boolean(insert.error));
    const del = await rejected.client.from("account_access_approvals").delete().eq("user_id", rejected.id);
    record("customer delete is denied", Boolean(del.error) || await ownStatus(rejected) === "REJECTED");
  });

  await t.test("an issued session loses tenant access immediately after revocation", async () => {
    const victim = await fixtureUser("victim");
    await setStatus(victim, "APPROVED", admin);
    record("session works while APPROVED", Boolean((await createWorkspace(victim)).data?.id));
    await setStatus(victim, "REVOKED", admin);
    const after = await createWorkspace(victim);
    record("same session is denied after REVOKED", !after.data?.id && Boolean(after.error));
    const sessionStillValid = await victim.client.auth.getUser();
    record("the JWT itself is still valid, so enforcement is the database policy", !sessionStillValid.error);
  });

  await t.test("tenant isolation between approved accounts", async () => {
    const mine = await createWorkspace(approved);
    const seen = await other.client.from("trust_workspaces").select("id").eq("id", mine.data.id);
    record("another approved user cannot read the workspace", (seen.data ?? []).length === 0);
    const edit = await other.client.from("trust_workspaces").update({ name: "tampered" }).eq("id", mine.data.id).select("id");
    record("another approved user cannot update the workspace", (edit.data ?? []).length === 0);
  });

  await t.test("approval audit is append-only and not readable by customers", async () => {
    const asCustomer = await approved.client.from("account_access_approval_events").select("id").limit(1);
    record("customers cannot read audit events", Boolean(asCustomer.error) || (asCustomer.data ?? []).length === 0);
    const row = (await service.from("account_access_approval_events").select("id").eq("user_id", approved.id).limit(1)).data?.[0];
    record("a status change produced audit events", Boolean(row));
    const upd = await service.from("account_access_approval_events").update({ reason: "rewritten" }).eq("id", row.id);
    record("service role cannot rewrite an event", Boolean(upd.error));
    const del = await service.from("account_access_approval_events").delete().eq("id", row.id);
    record("service role cannot delete an event", Boolean(del.error));
    const types = (await service.from("account_access_approval_events").select("event_type").eq("user_id", rejected.id)).data?.map((r) => r.event_type) ?? [];
    record("REJECTED transition is audited as ACCESS_REJECTED", types.includes("ACCESS_REJECTED"));
  });

  await t.test("account erasure anonymises audit rows instead of deleting them", async () => {
    const subject = await fixtureUser("erasure");
    await setStatus(subject, "APPROVED", admin);
    await subject.client.rpc("record_account_access_attempt", { p_access_granted: true });
    const before = (await service.from("account_access_approval_events").select("id").eq("user_id", subject.id)).data ?? [];
    record("subject has audit history", before.length >= 2);
    const erased = await service.auth.admin.deleteUser(subject.id);
    users.delete("erasure");
    record("user deletion succeeds", !erased.error);
    const after = (await service.from("account_access_approval_events").select("id,user_id,actor_user_id").in("id", before.map((r) => r.id))).data ?? [];
    record("every audit row survived", after.length === before.length);
    record("subject identity is nulled", after.every((r) => r.user_id === null));
    record("actor identity is nulled", after.every((r) => r.actor_user_id === null || r.actor_user_id !== subject.id));
  });
});
