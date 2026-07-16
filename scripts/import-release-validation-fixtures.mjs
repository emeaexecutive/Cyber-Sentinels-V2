import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseReleaseValidationCases } from "../lib/validation/release-case.ts";

if (process.env.IMPORT_VALIDATION_FIXTURES !== "true") { process.stderr.write("Blocked: IMPORT_VALIDATION_FIXTURES=true is required.\n"); process.exit(2); }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY names are required.");
const cases = parseReleaseValidationCases(JSON.parse(await readFile(new URL("../data/validation/release-1-candidate/cases.json", import.meta.url), "utf8")));
const rows = cases.map((item) => ({
  case_id: item.caseId, dataset_id: item.datasetId, dataset_version: item.datasetVersion,
  entity_type: item.entityType, workflow: item.workflowType, signal_type: item.signalType,
  evidence_mode: item.evidenceMode, input_evidence: item.evidenceReferences.map((reference) => ({ reference })),
  expected_outcome: item.expectedDecision, actual_outcome: item.actualDecision,
  ground_truth_label: null, review_status: "pending", reviewer_id: null, reviewer_role: null,
  reviewed_at: null, review_confidence: null, source_provenance: item.provenance,
  usage_boundary: item.licenceBoundary, limitations: item.limitations, evidence_references: item.evidenceReferences,
  reviewer_rationale: null, provider_versions: item.providerVersions, review_mode: "dual",
  created_at: item.createdAt, updated_at: item.updatedAt,
}));
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await client.from("release_validation_cases").upsert(rows, { onConflict: "case_id", ignoreDuplicates: true });
if (error) throw error;
process.stdout.write(`${JSON.stringify({ imported: rows.length, reviewStatus: "pending", datasetVersion: cases[0]?.datasetVersion }, null, 2)}\n`);
