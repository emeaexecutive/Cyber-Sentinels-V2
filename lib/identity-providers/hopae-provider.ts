import "server-only";

import {
  createHopaeVerification,
  getHopaeConfig,
  getHopaeVerificationStatus,
  getHopaeVerificationUserInfo,
} from "@/lib/hopae";
import type { UpstreamIdentityProvider } from "@/lib/identity-providers/types";

export const hopaeIdentityProvider: UpstreamIdentityProvider = {
  provider_name: "Hopae Connect",
  provider_type: "identity_verification_service",
  isEnabled: () => getHopaeConfig().enabled,
  createVerification: createHopaeVerification,
  getVerificationStatus: getHopaeVerificationStatus,
  getVerificationUserInfo: getHopaeVerificationUserInfo,
};
