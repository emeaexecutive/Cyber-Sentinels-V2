export type TrustFactor = {
  label: string;
  score: number;
  detail: string;
};

export type TimelineEvent = {
  label: string;
  status: string;
  detail: string;
};

export function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

export function averageScore(values: number[]) {
  if (!values.length) {
    return 0;
  }

  return clampScore(values.reduce((total, value) => total + value, 0) / values.length);
}

export function riskFromScore(score: number) {
  if (score >= 85) return "low";
  if (score >= 70) return "moderate";
  if (score >= 50) return "review";
  return "high";
}

export function authenticityLabel(score: number) {
  if (score >= 85) return "Strong authenticity";
  if (score >= 70) return "Likely authentic";
  if (score >= 50) return "Needs review";
  return "High uncertainty";
}

export function placeholderLivenessCheck(seed = 82): TrustFactor {
  return {
    label: "Liveness",
    score: clampScore(seed),
    detail: "Placeholder liveness service checks face presence, frame continuity and challenge response.",
  };
}

export function placeholderVoiceMismatchCheck(seed = 76): TrustFactor {
  return {
    label: "Voice mismatch",
    score: clampScore(seed),
    detail: "Placeholder voice mismatch service compares claimed speaker consistency and session audio stability.",
  };
}

export function placeholderWebcamIntegrityCheck(seed = 81): TrustFactor {
  return {
    label: "Webcam integrity",
    score: clampScore(seed),
    detail: "Placeholder webcam integrity service checks device continuity, capture anomalies and session interruptions.",
  };
}

export function placeholderC2paCheck(seed = 74): TrustFactor {
  return {
    label: "C2PA provenance",
    score: clampScore(seed),
    detail: "Placeholder C2PA parser checks for provenance manifests, signer state and tamper indicators.",
  };
}

export function placeholderSynthIdCheck(seed = 68): TrustFactor {
  return {
    label: "SynthID detection",
    score: clampScore(seed),
    detail: "Placeholder SynthID detector checks for synthetic watermark signals and model-origin indicators.",
  };
}

export function candidateTrustFactors() {
  return [
    placeholderLivenessCheck(84),
    placeholderVoiceMismatchCheck(78),
    placeholderWebcamIntegrityCheck(82),
    {
      label: "Profile consistency",
      score: 80,
      detail: "Recruiter-supplied profile claims are compared against submitted candidate context.",
    },
  ];
}

export function provenanceTrustFactors() {
  return [
    placeholderC2paCheck(76),
    placeholderSynthIdCheck(69),
    {
      label: "Upload chain",
      score: 73,
      detail: "Placeholder upload-chain review checks continuity between source, uploader and review event.",
    },
    {
      label: "Metadata integrity",
      score: 71,
      detail: "Placeholder metadata review checks whether core file metadata appears intact, missing or modified.",
    },
  ];
}

export function trustScoreFromFactors(factors: TrustFactor[]) {
  return averageScore(factors.map((factor) => factor.score));
}

export function verificationTimeline(kind: "candidate" | "recruiter" | "interview" | "provenance" | "agent"): TimelineEvent[] {
  const common = [
    {
      label: "Request received",
      status: "complete",
      detail: "The verification request is recorded and ready for review.",
    },
    {
      label: "Evidence reviewed",
      status: "in_review",
      detail: "Submitted identity, media or operational evidence is checked against placeholder trust services.",
    },
    {
      label: "Human review",
      status: "pending",
      detail: "Risk-bearing outcomes can be escalated before a final trust state is accepted.",
    },
  ];

  if (kind === "agent") {
    return [
      common[0],
      {
        label: "Agent passport created",
        status: "complete",
        detail: "Agent owner, purpose, model context and permission scope are recorded.",
      },
      common[2],
    ];
  }

  if (kind === "interview") {
    return [
      common[0],
      {
        label: "Live interview checks",
        status: "in_review",
        detail: "Liveness, voice mismatch and webcam integrity are assessed during the session.",
      },
      common[2],
    ];
  }

  return common;
}

