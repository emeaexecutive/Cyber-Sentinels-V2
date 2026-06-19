export type UpstreamIdentityProviderType =
  | "government_eid"
  | "digital_identity_wallet"
  | "identity_verification_service"
  | "enterprise_iam"
  | "proof_of_personhood"
  | "other";

export type UpstreamIdentityProof = {
  provider_name: string;
  provider_type: UpstreamIdentityProviderType;
  assurance_level: number | null;
  provenance: Record<string, unknown>;
  normalized_user: Record<string, unknown>;
  verification_status: string;
};

export interface UpstreamIdentityProvider {
  readonly provider_name: string;
  readonly provider_type: UpstreamIdentityProviderType;
  isEnabled(): boolean;
  createVerification(input: {
    providerId: string;
    redirectUri: string;
    matchData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<Record<string, unknown>>;
  getVerificationStatus(verificationId: string): Promise<Record<string, unknown>>;
  getVerificationUserInfo(verificationId: string): Promise<Record<string, unknown>>;
}
