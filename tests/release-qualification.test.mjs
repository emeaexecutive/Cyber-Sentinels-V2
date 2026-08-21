import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_STAGING_SUPABASE_PROJECT_REF,
  PRODUCTION_SUPABASE_PROJECT_REF,
  evaluateReleaseQualification,
} from "../tools/release/release-qualification.ts";

const completeInput = (overrides = {}) => ({
  manifestPresent: true,
  stopRulesPresent: true,
  observabilityPlanPresent: true,
  recoveryDocPresent: true,
  performanceReportPresent: true,
  compatibilityDocPresent: true,
  evidencePackagePresent: true,
  productionUntouched: true,
  noSecrets: true,
  branchIsStagingFoundation: true,
  ...overrides,
});

test("release qualification requires complete manifest and stop rules", () => {
  const result = evaluateReleaseQualification(completeInput());

  assert.equal(result.status, "pass");
  assert.equal(result.codes.length, 0);
});

test("release qualification flags missing release stop rules", () => {
  const result = evaluateReleaseQualification({
    manifestPresent: true,
    stopRulesPresent: false,
    observabilityPlanPresent: true,
    recoveryDocPresent: true,
    performanceReportPresent: true,
    compatibilityDocPresent: true,
    evidencePackagePresent: true,
    productionUntouched: true,
    noSecrets: true,
    branchIsStagingFoundation: true,
  });

  assert.equal(result.status, "fail");
  assert.equal(result.codes[0], "RELEASE_STOP_RULES_MISSING");
});

test("external Preview capacity is a fail-closed release exception, never a green check", () => {
  const result = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "disposable_preview",
    supabaseProjectRef: "svcioqohebfoeuxzjcxy",
    previewCapacityState: "unavailable",
    databaseProof: "previously_qualified",
  }));

  assert.equal(result.status, "fail");
  assert.deepEqual(result.codes, ["EXTERNAL_PREVIEW_CAPACITY_UNAVAILABLE"]);
  assert.equal(result.previewQualification?.status, "failed");
  assert.deepEqual(result.releaseException, {
    classification: "EXTERNAL_PREVIEW_CAPACITY_UNAVAILABLE",
    databaseProof: "PREVIOUSLY_QUALIFIED",
    currentPreviewControlPlane: "BLOCKED_CAPACITY",
    required: true,
  });
});

test("disposable Preview skips only the exact unsupported Free-tier template operation", () => {
  const result = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "disposable_preview",
    supabaseProjectRef: "eomjxkexdgrryipkdqlu",
    emailTemplateMutationOutcome: "unsupported_free_tier_default_provider",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    canonicalStagingRealEmailQualified: true,
  }));

  assert.equal(result.status, "pass");
  assert.equal(result.codes.length, 0);
  assert.equal(result.previewQualification?.status, "skipped");
  assert.equal(result.previewQualification?.code, "PREVIEW_EMAIL_TEMPLATES_UNSUPPORTED");
  assert.match(result.previewQualification?.reason ?? "", /Disposable Supabase Preview/i);
});

test("disposable Preview ordinary migration and auth failures fail closed", () => {
  for (const overrides of [
    { schemaMigrationQualified: false, authSchemaQualified: true },
    { schemaMigrationQualified: true, authSchemaQualified: false },
  ]) {
    const result = evaluateReleaseQualification(completeInput({
      qualificationEnvironment: "disposable_preview",
      supabaseProjectRef: "eomjxkexdgrryipkdqlu",
      emailTemplateMutationOutcome: "unsupported_free_tier_default_provider",
      canonicalStagingRealEmailQualified: true,
      ...overrides,
    }));
    assert.equal(result.status, "fail");
    assert.notEqual(result.previewQualification?.status, "skipped");
  }
});

test("disposable Preview does not skip an ordinary email operation failure", () => {
  const result = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "disposable_preview",
    supabaseProjectRef: "eomjxkexdgrryipkdqlu",
    emailTemplateMutationOutcome: "failed",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    canonicalStagingRealEmailQualified: true,
  }));
  assert.equal(result.status, "fail");
  assert.ok(result.codes.includes("PREVIEW_EMAIL_TEMPLATE_QUALIFICATION_FAILED"));
});

test("canonical staging and Production never accept disposable email skip semantics", () => {
  for (const [qualificationEnvironment, supabaseProjectRef, expectedCode] of [
    ["canonical_staging", CANONICAL_STAGING_SUPABASE_PROJECT_REF, "CANONICAL_STAGING_EMAIL_GATE_FAILED"],
    ["production", PRODUCTION_SUPABASE_PROJECT_REF, "PRODUCTION_EMAIL_GATE_FAILED"],
  ]) {
    const result = evaluateReleaseQualification(completeInput({
      qualificationEnvironment,
      supabaseProjectRef,
      emailTemplateMutationOutcome: "unsupported_free_tier_default_provider",
      schemaMigrationQualified: true,
      authSchemaQualified: true,
      canonicalStagingRealEmailQualified: true,
    }));
    assert.equal(result.status, "fail");
    assert.ok(result.codes.includes(expectedCode));
    assert.notEqual(result.previewQualification?.status, "skipped");
  }
});

test("canonical staging and Production project identities are exact", () => {
  const stagingMismatch = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "canonical_staging",
    supabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
  }));
  assert.equal(stagingMismatch.status, "fail");
  assert.ok(stagingMismatch.codes.includes("CANONICAL_STAGING_PROJECT_REF_MISMATCH"));

  const productionMismatch = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "production",
    supabaseProjectRef: CANONICAL_STAGING_SUPABASE_PROJECT_REF,
  }));
  assert.equal(productionMismatch.status, "fail");
  assert.ok(productionMismatch.codes.includes("PRODUCTION_PROJECT_REF_MISMATCH"));
});

test("Production requires the full strict email gate even when templates are supported", () => {
  const incomplete = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "production",
    supabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    emailTemplateMutationOutcome: "supported",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    productionEmailQualified: false,
  }));
  assert.equal(incomplete.status, "fail");
  assert.ok(incomplete.codes.includes("PRODUCTION_EMAIL_GATE_FAILED"));

  const qualified = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "production",
    supabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    emailTemplateMutationOutcome: "supported",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    productionEmailQualified: true,
  }));
  assert.equal(qualified.status, "pass");
  assert.equal(qualified.previewQualification?.code, "PRODUCTION_EMAIL_GATE_STRICT");
});

test("unknown environments and Preview-to-Production bindings fail closed", () => {
  const unknown = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "unknown",
  }));
  assert.equal(unknown.status, "fail");
  assert.ok(unknown.codes.includes("QUALIFICATION_ENVIRONMENT_UNKNOWN"));

  const productionBinding = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "disposable_preview",
    supabaseProjectRef: PRODUCTION_SUPABASE_PROJECT_REF,
    emailTemplateMutationOutcome: "unsupported_free_tier_default_provider",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    canonicalStagingRealEmailQualified: true,
  }));
  assert.equal(productionBinding.status, "fail");
  assert.ok(productionBinding.codes.includes("PREVIEW_BOUND_TO_PRODUCTION"));
});

test("Preview bound to canonical staging uses the strict staging gate", () => {
  const unsupported = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "disposable_preview",
    supabaseProjectRef: CANONICAL_STAGING_SUPABASE_PROJECT_REF,
    emailTemplateMutationOutcome: "unsupported_free_tier_default_provider",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    canonicalStagingRealEmailQualified: true,
  }));
  assert.equal(unsupported.status, "fail");
  assert.ok(unsupported.codes.includes("CANONICAL_STAGING_EMAIL_GATE_FAILED"));
  assert.notEqual(unsupported.previewQualification?.status, "skipped");

  const qualified = evaluateReleaseQualification(completeInput({
    qualificationEnvironment: "disposable_preview",
    supabaseProjectRef: CANONICAL_STAGING_SUPABASE_PROJECT_REF,
    emailTemplateMutationOutcome: "supported",
    schemaMigrationQualified: true,
    authSchemaQualified: true,
    canonicalStagingRealEmailQualified: true,
  }));
  assert.equal(qualified.status, "pass");
  assert.equal(qualified.previewQualification?.code, "CANONICAL_STAGING_EMAIL_GATE_STRICT");
});
