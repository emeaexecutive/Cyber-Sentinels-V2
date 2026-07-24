import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  csvCell,
  deriveTrustDna,
  highRisk,
  trustHealth,
  trustStateDistribution,
} from "../src/lib/trust-centre/projections.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Trust Centre projections remain measured and explainable", () => {
  const runtime = [
    { subject_id: "human:1", state: "VERIFIED", normalized_score: 90, current_risk_flags: [] },
    { subject_id: "agent:1", state: "CHALLENGED", normalized_score: 35, current_risk_flags: ["DRIFT"] },
  ];
  assert.equal(trustHealth(runtime), 63);
  assert.deepEqual(trustStateDistribution(runtime), [
    { label: "CHALLENGED", count: 1 },
    { label: "VERIFIED", count: 1 },
  ]);
  assert.equal(highRisk(runtime).length, 1);
  assert.equal(trustHealth([{ normalized_score: null }]), null);

  const dimensions = deriveTrustDna(
    [
      {
        domain_key: "IDENTITY",
        evidence_type: "passport",
        result: "POSITIVE",
        assurance_level: "HIGH",
      },
    ],
    []
  );
  const identity = dimensions.find((item) => item.dimension === "Identity");
  assert.ok(identity);
  assert.equal(identity.evidenceCount, 1);
  assert.match(identity.explanation, /canonical evidence/i);
  assert.equal(
    dimensions.find((item) => item.dimension === "Network")?.score,
    null
  );
});

test("CSV export neutralizes delimiter and quote ambiguity", () => {
  assert.equal(csvCell('value,"formula"'), '"value,""formula"""');
});

test("Trust Centre page is protected, keyboard navigable, and live", async () => {
  const [middleware, component, page] = await Promise.all([
    read("middleware.ts"),
    read("src/components/trust-centre/EnterpriseTrustCentre.tsx"),
    read("app/(enterprise)/trust-centre/page.tsx"),
  ]);
  assert.match(middleware, /"\/trust-centre"/);
  assert.match(component, /role="tablist"/);
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /focus:ring-2/);
  assert.match(component, /setInterval/);
  assert.match(component, /X-Enterprise-Id/);
  assert.doesNotMatch(component, /Math\.random/);
  assert.match(page, /force-dynamic/);
});

test("Trust Centre APIs authenticate, tenant-scope, bound, and fail safely", async () => {
  const [overview, search, reports, alerts, repository] = await Promise.all([
    read("app/api/trust-centre/overview/route.ts"),
    read("app/api/trust-centre/search/route.ts"),
    read("app/api/trust-centre/reports/route.ts"),
    read("app/api/trust-centre/alerts/bulk/route.ts"),
    read("src/lib/trust-centre/repository.ts"),
  ]);
  for (const route of [overview, search, reports, alerts]) {
    assert.match(route, /trustCentreContext/);
    assert.match(route, /trustCentreFailure/);
  }
  assert.match(repository, /\.eq\("enterprise_id", enterpriseId\)/);
  assert.match(repository, /Promise\.all/);
  assert.match(repository, /Math\.min\(200/);
  assert.match(search, /Math\.min\(50/);
  assert.match(alerts, /alertIds\.length > 100/);
  assert.doesNotMatch(repository, /normalized_facts|payload/);
});

test("alert collaboration is RLS protected, append-only, and service-only", async () => {
  const migration = await read(
    "supabase/migrations/202607240001_enterprise_trust_centre.sql"
  );
  assert.match(migration, /enable row level security/);
  assert.match(migration, /user_can_access_trust_workspace\(enterprise_id\)/);
  assert.match(migration, /trust_alert_activity_append_only/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /revoke all on function public\.manage_trust_centre_alerts_v1/);
  assert.match(migration, /trust_architecture_audit_log/);
  assert.doesNotMatch(migration, /disable row level security/i);
});
