export const linkedInVerificationStatuses = [
  "unverified",
  "submitted",
  "consistent",
  "mismatch",
  "manual_review",
  "verified_external",
] as const;

export type LinkedInVerificationStatus =
  (typeof linkedInVerificationStatuses)[number];

export type LinkedInEvidence = {
  linkedin_url: string | null;
  linkedin_verification_status: LinkedInVerificationStatus;
  linkedin_profile_consistency: number | null;
  linkedin_claimed_company: string | null;
  linkedin_claimed_role: string | null;
  linkedin_review_required: boolean;
};

function getOptionalFormText(formData: FormData, field: string, maxLength = 160) {
  const value = String(formData.get(field) ?? "").trim();

  if (!value) {
    return null;
  }

  if (value.length > maxLength) {
    throw new Error("Invalid input");
  }

  return value;
}

function normalizeLinkedInUrl(value: string | null) {
  if (!value) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid input");
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");

  if (url.protocol !== "https:" || hostname !== "linkedin.com") {
    throw new Error("Invalid input");
  }

  if (!url.pathname.toLowerCase().startsWith("/in/")) {
    throw new Error("Invalid input");
  }

  return url.toString();
}

export function getLinkedInEvidence(formData: FormData): LinkedInEvidence {
  const linkedinUrl = normalizeLinkedInUrl(
    getOptionalFormText(formData, "linkedin_url", 300)
  );
  const claimedCompany = getOptionalFormText(
    formData,
    "linkedin_claimed_company"
  );
  const claimedRole = getOptionalFormText(formData, "linkedin_claimed_role");
  const submitted = Boolean(linkedinUrl);

  return {
    linkedin_url: linkedinUrl,
    linkedin_verification_status: submitted ? "submitted" : "unverified",
    linkedin_profile_consistency: submitted ? null : null,
    linkedin_claimed_company: claimedCompany,
    linkedin_claimed_role: claimedRole,
    linkedin_review_required: submitted,
  };
}
