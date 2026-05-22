export type OriginStatus =
  | "unknown"
  | "verified"
  | "missing"
  | "tampered"
  | "intact"
  | "stripped"
  | "found"
  | "not_found"
  | "broken";

export type OriginTraceSignals = {
  attributionConfidence: number;
  likelySourceType: string;
  modelFingerprintRisk: number;
  metadataIntegrity: OriginStatus;
  watermarkStatus: OriginStatus;
  c2paStatus: OriginStatus;
  uploadChainStatus: OriginStatus;
};
