import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("internal writers deny direct client calls while owner triggers and service calls continue", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      grant usage on schema public to anon, authenticated, service_role;
      create table governance_policies(id uuid default gen_random_uuid(),workspace_id uuid,name text,description text,trigger_type text,severity text,action_type text,requires_human_review boolean,created_at timestamptz default now());
      create table governance_actions(id uuid default gen_random_uuid(),policy_id uuid,subject_type text,subject_id uuid,action_status text,resolution_notes text,created_at timestamptz default now());
    `);
    const sources = [
      ["202606080005_operational_governance_engine.sql", ["ensure_governance_policy", "create_governance_action_if_needed"]],
      ["202606080007_operational_notifications_coordination.sql", ["notification_insert"]],
      ["202606080002_trust_timeline_events.sql", ["trust_timeline_record_event"]],
    ];
    for (const [file, names] of sources) {
      const source = await readFile(`supabase/migrations/${file}`, "utf8");
      for (const name of names) {
        const start = source.indexOf(`create or replace function public.${name}(`);
        assert.ok(start >= 0);
        const end = source.indexOf("$$;", start);
        assert.ok(end > start);
        await db.exec(source.slice(start, end + 3));
      }
    }
    const signatures = [
      "ensure_governance_policy(text,text,text,text,text)",
      "create_governance_action_if_needed(uuid,text,uuid,text,text)",
      "notification_insert(uuid,text,text,text,text,jsonb)",
      "trust_timeline_record_event(jsonb,text,text,text,text,text)",
    ];
    for (const signature of signatures) {
      assert.equal((await db.query("select has_function_privilege('anon',$1,'execute') allowed", [signature])).rows[0].allowed, true);
    }
    await db.exec(await readFile("supabase/migrations/20260926113958_restrict_internal_governance_helper_execution.sql", "utf8"));
    for (const signature of signatures) {
      const result = await db.query("select has_function_privilege('anon',$1,'execute') anon,has_function_privilege('authenticated',$1,'execute') authenticated,has_function_privilege('service_role',$1,'execute') service", [signature]);
      assert.deepEqual(result.rows[0], { anon: false, authenticated: false, service: true });
    }
    const calls = [
      "ensure_governance_policy('fixture','fixture','fixture','info','review')",
      "create_governance_action_if_needed(null,'agent',gen_random_uuid(),'pending','fixture')",
      "notification_insert(null,'fixture','fixture','fixture')",
      "trust_timeline_record_event('{}','fixture','fixture','fixture')",
    ];
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`);
      for (const call of calls) await assert.rejects(db.query(`select public.${call}`), (error) => error.code === "42501");
      await db.exec("reset role");
    }
    // Existing trigger execution context is its trusted owner, not the triggering user.
    await db.exec(`
      create table trigger_fixture(id uuid default gen_random_uuid());
      create function trigger_fixture_writer() returns trigger language plpgsql security definer set search_path=public as $$
      declare policy uuid; begin
        policy := public.ensure_governance_policy('fixture','fixture','fixture','info','review');
        perform public.create_governance_action_if_needed(policy,'agent',new.id,'pending','fixture');
        return new;
      end; $$;
      create trigger writer after insert on trigger_fixture for each row execute function trigger_fixture_writer();
      grant insert on trigger_fixture to authenticated;
      set role authenticated; insert into trigger_fixture default values; reset role;
    `);
    assert.equal((await db.query("select count(*)::int n from governance_actions")).rows[0].n, 1);
    await db.exec("set role service_role");
    assert.equal((await db.query("select public.ensure_governance_policy('fixture','fixture','service-fixture','info','review') is not null ok")).rows[0].ok, true);
  } finally { await db.close(); }
});
