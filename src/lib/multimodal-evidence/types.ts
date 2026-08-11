import type { FabricReference, FabricSubject } from "../trust-fabric/types.ts";

export const multimodalArtifactModalities = [
  "image",
  "text",
  "video",
  "audio",
  "document",
  "generated_synthetic_media",
] as const;
export type MultimodalArtifactModality = (typeof multimodalArtifactModalities)[number];

export const detectorAnalysisScopes = [
  "image",
  "text",
  "image_text_joint",
  "video",
  "audio",
  "document",
  "cross_modal",
] as const;
export type DetectorAnalysisScope = (typeof detectorAnalysisScopes)[number];

export type MultimodalArtifactReference = {
  artifactId: string;
  enterpriseId: string;
  subject: FabricSubject;
  modalities: MultimodalArtifactModality[];
  contentDigest: string;
  mediaType: string;
  storageReference: FabricReference;
  submittedBy: FabricReference;
  submittedAt: string;
  provenanceReferences: FabricReference[];
};

export type ArtifactProvenanceEvidence = {
  provenanceId: string;
  artifactReference: FabricReference;
  sourceIdentity: FabricReference;
  captureOrGenerationMethod: "captured" | "generated" | "transformed" | "unknown";
  signingOrAttestationReferences: FabricReference[];
  observedAt: string;
  evidenceReference: FabricReference;
};

/**
 * A detector result is evidence, never truth, authorization, or a policy
 * decision. Provider/model/version and the exact analysis scope remain bound
 * to every record so a later consensus step cannot erase provenance.
 */
export type MultimodalDetectorEvidence = {
  detectorEvidenceId: string;
  enterpriseId: string;
  artifactReference: FabricReference;
  providerId: string;
  detectorId: string;
  modelIdentifier: string;
  modelVersion: string;
  analysisScope: DetectorAnalysisScope;
  inputModalities: MultimodalArtifactModality[];
  resultLabel: string;
  score: number | null;
  scoreScale: { minimum: number; maximum: number } | null;
  confidence: number | null;
  reasonCodes: string[];
  observedAt: string;
  payloadDigest: string;
  evidenceReference: FabricReference;
  derivedFromEvidenceReferences: FabricReference[];
};

export type DetectorAgreementRecord = {
  agreementId: string;
  artifactReference: FabricReference;
  state: "CONSENSUS" | "DISAGREEMENT" | "INSUFFICIENT_EVIDENCE";
  detectorEvidenceReferences: FabricReference[];
  conflictingEvidenceReferences: FabricReference[];
  explanationReasonCodes: string[];
  method: string;
  methodVersion: string;
  evidenceReference: FabricReference;
};

export type MultimodalPolicyInterpretation = {
  interpretationId: string;
  artifactReference: FabricReference;
  policyReference: FabricReference;
  detectorEvidenceReferences: FabricReference[];
  agreementReference: FabricReference | null;
  outcome: "ALLOW" | "REVIEW" | "DENY";
  consequenceReference: FabricReference | null;
  decisionReference: FabricReference;
  replayReference: FabricReference;
  trustMemoryReference: FabricReference | null;
  evidenceGraphReferences: FabricReference[];
  reasonCodes: string[];
};

export type MultimodalOutcomeEvidence = {
  outcomeReference: FabricReference;
  decisionReference: FabricReference;
  consequenceReference: FabricReference;
  sourceIdentity: FabricReference;
  independentlyProven: boolean;
  evidenceReference: FabricReference;
  observedAt: string;
};

export type MultimodalEvidenceEnvelope = {
  subject: FabricSubject;
  artifact: MultimodalArtifactReference;
  provenance: ArtifactProvenanceEvidence[];
  detectorEvidence: MultimodalDetectorEvidence[];
  agreement: DetectorAgreementRecord | null;
  policyInterpretation: MultimodalPolicyInterpretation | null;
  outcomeEvidence: MultimodalOutcomeEvidence[];
};

export function assertDetectorEvidencePreserved(envelope: MultimodalEvidenceEnvelope): void {
  const ids = envelope.detectorEvidence.map((record) => record.detectorEvidenceId);
  if (new Set(ids).size !== ids.length) throw new TypeError("Detector evidence IDs must be distinct.");
  if (!envelope.agreement) return;
  const retained = new Set(envelope.agreement.detectorEvidenceReferences.map((reference) => reference.id));
  for (const record of envelope.detectorEvidence) {
    if (!retained.has(record.evidenceReference.id)) {
      throw new TypeError("Agreement records must preserve every detector evidence reference.");
    }
  }
}
