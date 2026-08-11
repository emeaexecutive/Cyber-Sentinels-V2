import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertDetectorEvidencePreserved,
  detectorAnalysisScopes,
  multimodalArtifactModalities,
} from "../src/lib/multimodal-evidence/types.ts";

const reference = (id) => ({ type: "multimodal_evidence", id });
const detector = (id, analysisScope, resultLabel) => ({
  detectorEvidenceId: id,
  enterpriseId: "11111111-1111-4111-8111-111111111111",
  artifactReference: reference("artifact:1"),
  providerId: `provider:${id}`,
  detectorId: `detector:${id}`,
  modelIdentifier: `model:${id}`,
  modelVersion: "1.0.0",
  analysisScope,
  inputModalities: analysisScope === "image_text_joint" ? ["image", "text"] : [analysisScope],
  resultLabel,
  score: null,
  scoreScale: null,
  confidence: null,
  reasonCodes: [],
  observedAt: "2026-08-11T12:00:00.000Z",
  payloadDigest: "a".repeat(64),
  evidenceReference: reference(`evidence:${id}`),
  derivedFromEvidenceReferences: [],
});

test("multimodal evidence supports every required artifact modality and joint analysis", () => {
  assert.deepEqual(multimodalArtifactModalities, ["image", "text", "video", "audio", "document", "generated_synthetic_media"]);
  assert.ok(detectorAnalysisScopes.includes("image_text_joint"));
  assert.ok(detectorAnalysisScopes.includes("cross_modal"));
});

test("detector disagreement preserves image, text and joint evidence independently", () => {
  const records = [
    detector("image", "image", "SAFE"),
    detector("text", "text", "SAFE"),
    detector("joint", "image_text_joint", "HARMFUL"),
  ];
  const envelope = {
    subject: { type: "document", id: "subject:1", displayName: "Artifact subject" },
    artifact: {}, provenance: [], detectorEvidence: records, policyInterpretation: null, outcomeEvidence: [],
    agreement: {
      agreementId: "agreement:1", artifactReference: reference("artifact:1"), state: "DISAGREEMENT",
      detectorEvidenceReferences: records.map((record) => record.evidenceReference),
      conflictingEvidenceReferences: [records[2].evidenceReference], explanationReasonCodes: ["JOINT_MODEL_CONFLICT"],
      method: "provider-neutral-preservation", methodVersion: "1", evidenceReference: reference("agreement:1"),
    },
  };
  assert.doesNotThrow(() => assertDetectorEvidencePreserved(envelope));
  assert.throws(() => assertDetectorEvidencePreserved({
    ...envelope,
    agreement: { ...envelope.agreement, detectorEvidenceReferences: envelope.agreement.detectorEvidenceReferences.slice(0, 2) },
  }), /preserve every detector evidence reference/);
});

test("architecture truth does not claim a working harmful-meme detector", async () => {
  const architecture = await readFile(new URL("../docs/MULTIMODAL_EVIDENCE_EXTENSIBILITY.md", import.meta.url), "utf8");
  assert.match(architecture, /detector output as evidence/i);
  assert.match(architecture, /HARMFUL_MEME_DETECTION = NOT_IMPLEMENTED/);
  assert.doesNotMatch(architecture, /HARMFUL_MEME_DETECTION = WORKING/);
});
