export type MediaType =
  | "image"
  | "video"
  | "audio"
  | "document"
  | "profile"
  | "agent";

export type ReviewStatus =
  | "pending"
  | "in_review"
  | "verified"
  | "rejected"
  | "escalated";

export type PassportSubjectType = "human" | "agent" | "candidate" | "content";

export type PassportTrustSignals = {
  subjectName: string;
  subjectType: PassportSubjectType;
  mediaType: MediaType;
  humanPresenceIndex: number;
  originTraceScore: number;
  attributionConfidence: number;
  syntheticRisk: number;
  reviewStatus: ReviewStatus;
};
