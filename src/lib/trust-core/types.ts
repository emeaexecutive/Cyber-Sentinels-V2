export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const TRUST_CANONICALIZATION = "JCS" as const;
export const TRUST_HASH_ALGORITHM = "SHA-256" as const;

export type TrustIntegrity = {
  canonicalization: typeof TRUST_CANONICALIZATION;
  hashAlgorithm: typeof TRUST_HASH_ALGORITHM;
};

export type TrustReference = {
  refType: string;
  refId: string;
  version?: string;
};

export type RuntimeValidation<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] };
