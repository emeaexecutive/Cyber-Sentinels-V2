# Evidence and Enterprise Trust Graph

Builds bounded, tenant-isolated evidence views through `EvidenceGraphService` and versioned entity topology through `TrustGraphService`. Repository implementations remain replaceable; graph reads never infer cross-tenant relationships. Mutations require optimistic versions and emit immutable events atomically.
