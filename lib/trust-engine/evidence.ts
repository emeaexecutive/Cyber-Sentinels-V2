export type EvidenceType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "profile"
  | "linkedin"
  | "agent_log"
  | "wallet"
  | "identity_document"
  | "meeting_recording";

export type EvidenceStatus =
  | "submitted"
  | "scanning"
  | "clean"
  | "suspicious"
  | "tampered"
  | "rejected"
  | "archived";

export type ChainOfCustodyStatus =
  | "intact"
  | "incomplete"
  | "broken"
  | "unknown";

export type EvidenceSignal =
  | "evidence_submitted"
  | "evidence_scan_started"
  | "evidence_scan_completed"
  | "evidence_tamper_detected"
  | "chain_of_custody_broken";

export type EvidenceAuditEvent =
  | "evidence_submitted"
  | "evidence_reviewed"
  | "evidence_linked_to_passport"
  | "evidence_chain_updated";

export type EvidenceRecord = {
  id: string;
  case_id: string | null;
  passport_id: string | null;
  file_name: string | null;
  evidence_type: EvidenceType;
  media_type: string | null;
  source: string | null;
  submitted_by: string | null;
  storage_path: string | null;
  hash: string | null;
  scan_status: EvidenceStatus;
  provenance_status: string | null;
  origin_trace_score: number | null;
  human_presence_index: number | null;
  tamper_status: string | null;
  chain_of_custody_status: ChainOfCustodyStatus;
  created_at: string | null;
};

type EvidenceRow = Partial<
  EvidenceRecord & {
    verification_case_id: string | null;
    file_url: string | null;
  }
>;

export const evidenceSignals: EvidenceSignal[] = [
  "evidence_submitted",
  "evidence_scan_started",
  "evidence_scan_completed",
  "evidence_tamper_detected",
  "chain_of_custody_broken",
];

export const evidenceAuditEvents: EvidenceAuditEvent[] = [
  "evidence_submitted",
  "evidence_reviewed",
  "evidence_linked_to_passport",
  "evidence_chain_updated",
];

export const demoEvidence: EvidenceRecord[] = [
  {
    id: "demo-evidence-001",
    case_id: "case-demo-human-01",
    passport_id: "passport-demo-human-01",
    file_name: "liveness-selfie-frame.png",
    evidence_type: "image",
    media_type: "image",
    source: "web_capture",
    submitted_by: "reviewer@cybersentinels.ai",
    storage_path: "demo/liveness-selfie-frame.png",
    hash: "sha256:8f1d-demo-liveness",
    scan_status: "clean",
    provenance_status: "verified",
    origin_trace_score: 86,
    human_presence_index: 91,
    tamper_status: "none_detected",
    chain_of_custody_status: "intact",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-evidence-002",
    case_id: "case-demo-candidate-02",
    passport_id: "passport-demo-candidate-02",
    file_name: "candidate-interview-recording.mp4",
    evidence_type: "meeting_recording",
    media_type: "video",
    source: "meeting_recording",
    submitted_by: "hiring-shield",
    storage_path: "demo/candidate-interview-recording.mp4",
    hash: "sha256:51bd-demo-video",
    scan_status: "scanning",
    provenance_status: "partial",
    origin_trace_score: 58,
    human_presence_index: 67,
    tamper_status: "under_review",
    chain_of_custody_status: "incomplete",
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
  },
  {
    id: "demo-evidence-003",
    case_id: "case-demo-content-03",
    passport_id: null,
    file_name: "origin-claim-package.zip",
    evidence_type: "document",
    media_type: "document",
    source: "manual_upload",
    submitted_by: "analyst@cybersentinels.ai",
    storage_path: "demo/origin-claim-package.zip",
    hash: "sha256:ad92-demo-origin",
    scan_status: "suspicious",
    provenance_status: "disputed",
    origin_trace_score: 31,
    human_presence_index: null,
    tamper_status: "metadata_mismatch",
    chain_of_custody_status: "broken",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: "demo-evidence-004",
    case_id: "case-demo-linkedin-04",
    passport_id: "passport-demo-linkedin-04",
    file_name: "linkedin-profile-url",
    evidence_type: "linkedin",
    media_type: "profile",
    source: "profile_link",
    submitted_by: "candidate",
    storage_path: "https://linkedin.com/in/demo-profile",
    hash: null,
    scan_status: "submitted",
    provenance_status: "unverified",
    origin_trace_score: 49,
    human_presence_index: null,
    tamper_status: "unknown",
    chain_of_custody_status: "unknown",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
  },
];

function normalizeStatus(value: unknown): EvidenceStatus {
  const status = String(value ?? "submitted");

  if (
    [
      "submitted",
      "scanning",
      "clean",
      "suspicious",
      "tampered",
      "rejected",
      "archived",
    ].includes(status)
  ) {
    return status as EvidenceStatus;
  }

  if (status === "pending") return "submitted";
  if (status === "pending_scan") return "scanning";

  return "submitted";
}

function normalizeEvidenceType(row: EvidenceRow): EvidenceType {
  const type = String(row.evidence_type ?? row.media_type ?? "document");

  if (
    [
      "image",
      "video",
      "audio",
      "document",
      "profile",
      "linkedin",
      "agent_log",
      "wallet",
      "identity_document",
      "meeting_recording",
    ].includes(type)
  ) {
    return type as EvidenceType;
  }

  return "document";
}

function normalizeChainStatus(value: unknown): ChainOfCustodyStatus {
  const status = String(value ?? "unknown");

  if (["intact", "incomplete", "broken", "unknown"].includes(status)) {
    return status as ChainOfCustodyStatus;
  }

  return "unknown";
}

export function normalizeEvidenceRows(rows: EvidenceRow[] | null | undefined) {
  return (rows ?? []).map((row): EvidenceRecord => {
    const scanStatus = normalizeStatus(row.scan_status);

    return {
      id: String(row.id),
      case_id: row.case_id ?? row.verification_case_id ?? null,
      passport_id: row.passport_id ?? null,
      file_name: row.file_name ?? "Evidence artefact",
      evidence_type: normalizeEvidenceType(row),
      media_type: row.media_type ?? null,
      source: row.source ?? "evidence_files",
      submitted_by: row.submitted_by ?? null,
      storage_path: row.storage_path ?? row.file_url ?? null,
      hash: row.hash ?? null,
      scan_status: scanStatus,
      provenance_status: row.provenance_status ?? "unknown",
      origin_trace_score: row.origin_trace_score ?? null,
      human_presence_index: row.human_presence_index ?? null,
      tamper_status:
        row.tamper_status ??
        (scanStatus === "tampered" ? "tamper_detected" : "unknown"),
      chain_of_custody_status: normalizeChainStatus(
        row.chain_of_custody_status
      ),
      created_at: row.created_at ?? null,
    };
  });
}

export function getEvidenceSummary(evidence: EvidenceRecord[]) {
  return {
    total: evidence.length,
    pendingScan: evidence.filter((item) =>
      ["submitted", "scanning"].includes(item.scan_status)
    ).length,
    suspicious: evidence.filter((item) =>
      ["suspicious", "tampered", "rejected"].includes(item.scan_status)
    ).length,
    custodyIssues: evidence.filter((item) =>
      ["incomplete", "broken", "unknown"].includes(
        item.chain_of_custody_status
      )
    ).length,
    linkedPassports: new Set(
      evidence.map((item) => item.passport_id).filter(Boolean)
    ).size,
    linkedCases: new Set(evidence.map((item) => item.case_id).filter(Boolean))
      .size,
  };
}
