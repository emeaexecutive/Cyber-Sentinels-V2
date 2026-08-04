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
};

export type ReleaseQualificationResult = {
  status: "pass" | "fail";
  codes: string[];
};

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

  return { status: codes.length === 0 ? "pass" : "fail", codes };
}
