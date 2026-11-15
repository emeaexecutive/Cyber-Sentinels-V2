# Execution06 financial intelligence

lib/treasury/intelligence.ts derives tenant-bound advisory signals from existing Replay over a60second window. Unexpected amounts, velocity, changed destinations/assets, invalid proof of possession, inactive agents, mandate/request replay, invalid authority, changed policy and shared-limit denials produce reason-linked signals. Multiple agents denied shared exposure produce a COORDINATED_LIMIT_ATTEMPT signal; this is a deterministic correlation, not proof of conspiracy or an AI fraud model.

Signals are returned by the local /api/status endpoint. The console displays actual decisions and separately read destination effects; protected hosted SOC alert integration is NOT WIRED. Shared-limit signal tests verify tenant filtering and that monitoring creates no new effects.

DETECT and CHALLENGE are deterministic at the authorization boundary. AUTHORISED INTERVENTION uses existing independent-human checks. CONTAIN uses existing SWARM quarantine or a human-authorized versioned policy stop. RECOVER requires reconciliation and fresh identity/mandates; old permits cannot resume after key rotation. LEARN is audit/analytics for review, not automatic policy expansion. No autonomous ability to move, freeze, seize or delete real funds exists.

