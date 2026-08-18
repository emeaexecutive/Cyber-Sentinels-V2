export type ReleaseQualificationInput = {
  manifestPresent: boolean;
  stopRulesPresent: boolean;
  observabilityPlanPresent: boolean;
  recoveryDocPresent: boolean;
  performanceReportPresent: boolean;
  compatibilityDocPresent: boolean;
  evidencePackagePresent: boolean;
  productionUntouched: boolean;
  noSecrets: boolean;
  branchIsStagingFoundation: boolean;
  qualificationEnvironment?: "disposable_preview" | "canonical_staging" | "production" | "unknown";
  supabaseProjectRef?: string;
  emailTemplateMutationOutcome?:
    | "supported"
    | "unsupported_free_tier_default_provider"
    | "failed";
  schemaMigrationQualified?: boolean;
  authSchemaQualified?: boolean;
  canonicalStagingRealEmailQualified?: boolean;
  productionEmailQualified?: boolean;
};

export type ReleaseQualificationResult = {
  status: "pass" | "fail";
  codes: string[];
  previewQualification?: {
    status: "pass" | "skipped" | "failed";
    code: string;
    reason?: string;
  };
};

export const PRODUCTION_SUPABASE_PROJECT_REF = "kecgtsfibkypjuaxqbjx";
export const CANONICAL_STAGING_SUPABASE_PROJECT_REF = "agpyhygpfmppjkxwcpac";

export function evaluateReleaseQualification(input: ReleaseQualificationInput): ReleaseQualificationResult {
  const codes: string[] = [];

  if (!input.manifestPresent) codes.push("RELEASE_MANIFEST_MISSING");
  if (!input.stopRulesPresent) codes.push("RELEASE_STOP_RULES_MISSING");
  if (!input.observabilityPlanPresent) codes.push("OBSERVABILITY_PLAN_MISSING");
  if (!input.recoveryDocPresent) codes.push("RECOVERY_RUNBOOK_MISSING");
  if (!input.performanceReportPresent) codes.push("PERFORMANCE_REPORT_MISSING");
  if (!input.compatibilityDocPresent) codes.push("COMPATIBILITY_REPORT_MISSING");
  if (!input.evidencePackagePresent) codes.push("EVIDENCE_PACKAGE_MISSING");
  if (!input.productionUntouched) codes.push("PRODUCTION_MODIFIED");
  if (!input.noSecrets) codes.push("SECRETS_EXPOSED");
  if (!input.branchIsStagingFoundation) codes.push("BRANCH_MISMATCH");

  let previewQualification: ReleaseQualificationResult["previewQualification"];
  if (input.qualificationEnvironment !== undefined) {
    let effectiveEnvironment = input.qualificationEnvironment;

    if (effectiveEnvironment === "unknown") {
      codes.push("QUALIFICATION_ENVIRONMENT_UNKNOWN");
    } else if (!input.supabaseProjectRef) {
      codes.push("SUPABASE_PROJECT_REF_MISSING");
    } else if (
      effectiveEnvironment === "disposable_preview" &&
      input.supabaseProjectRef === PRODUCTION_SUPABASE_PROJECT_REF
    ) {
      codes.push("PREVIEW_BOUND_TO_PRODUCTION");
    } else if (
      effectiveEnvironment === "canonical_staging" &&
      input.supabaseProjectRef !== CANONICAL_STAGING_SUPABASE_PROJECT_REF
    ) {
      codes.push("CANONICAL_STAGING_PROJECT_REF_MISMATCH");
    } else if (
      effectiveEnvironment === "production" &&
      input.supabaseProjectRef !== PRODUCTION_SUPABASE_PROJECT_REF
    ) {
      codes.push("PRODUCTION_PROJECT_REF_MISMATCH");
    } else {
      if (
        effectiveEnvironment === "disposable_preview" &&
        input.supabaseProjectRef === CANONICAL_STAGING_SUPABASE_PROJECT_REF
      ) {
        effectiveEnvironment = "canonical_staging";
      }

      if (input.schemaMigrationQualified !== true) {
        codes.push("SCHEMA_MIGRATION_QUALIFICATION_FAILED");
      }
      if (input.authSchemaQualified !== true) {
        codes.push("AUTH_SCHEMA_QUALIFICATION_FAILED");
      }

      const unsupported =
        input.emailTemplateMutationOutcome === "unsupported_free_tier_default_provider";

      if (effectiveEnvironment === "disposable_preview") {
        const maySkip =
          unsupported &&
          input.schemaMigrationQualified === true &&
          input.authSchemaQualified === true &&
          input.canonicalStagingRealEmailQualified === true;

        if (maySkip) {
          previewQualification = {
            status: "skipped",
            code: "PREVIEW_EMAIL_TEMPLATES_UNSUPPORTED",
            reason:
              "A non-canonical disposable Supabase Preview cannot mutate email templates with the Free-tier default provider; canonical staging real-email qualification remains mandatory and Production email qualification remains strict.",
          };
        } else if (unsupported && input.canonicalStagingRealEmailQualified !== true) {
          codes.push("CANONICAL_STAGING_REAL_EMAIL_QUALIFICATION_REQUIRED");
        } else if (input.emailTemplateMutationOutcome !== "supported") {
          codes.push("PREVIEW_EMAIL_TEMPLATE_QUALIFICATION_FAILED");
        }
      } else if (effectiveEnvironment === "canonical_staging") {
        if (
          input.emailTemplateMutationOutcome !== "supported" ||
          input.canonicalStagingRealEmailQualified !== true
        ) {
          codes.push("CANONICAL_STAGING_EMAIL_GATE_FAILED");
        } else {
          previewQualification = {
            status: "pass",
            code: "CANONICAL_STAGING_EMAIL_GATE_STRICT",
          };
        }
      } else if (effectiveEnvironment === "production") {
        if (
          input.emailTemplateMutationOutcome !== "supported" ||
          input.productionEmailQualified !== true
        ) {
          codes.push("PRODUCTION_EMAIL_GATE_FAILED");
        } else {
          previewQualification = {
            status: "pass",
            code: "PRODUCTION_EMAIL_GATE_STRICT",
          };
        }
      }
    }

    if (codes.length > 0 && !previewQualification) {
      previewQualification = {
        status: "failed",
        code: codes[codes.length - 1],
      };
    }
  }

  return {
    status: codes.length === 0 ? "pass" : "fail",
    codes,
    ...(previewQualification ? { previewQualification } : {}),
  };
}
