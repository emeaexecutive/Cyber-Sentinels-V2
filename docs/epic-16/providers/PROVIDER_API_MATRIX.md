# Provider API matrix

| Method/path | Access | Purpose | Safety controls |
|---|---|---|---|
| `GET /api/providers` | Authenticated | Registry/readiness, permitted executions/evidence, sanitized telemetry | RLS, pagination limit 1-50, no secrets/raw payloads |
| `PATCH /api/providers` | Allowlisted, verified admin | Audited enable/disable | Server-role RPC, reason, correlation ID, audit row |
| `PUT /api/providers` | Allowlisted, verified admin | Explicit provider health refresh | Authenticated provider discovery, sanitized durable snapshot, no secret response |
| `POST /api/providers` | Signed Hopae delivery | Callback intake | JSON, 256KB, raw-body HMAC, timestamp, replay ledger, atomic persistence |
| `POST /api/trust/execute` with `establish_trust` | Authenticated | Create provider-backed trust session | Server tenant check, policy check, server adapter/eID, pre-call execution record |
| `GET /api/trust/execute?provider_session_id=...` | Authenticated | Retrieve owned provider session | RLS ownership, server context, poll limit, terminal-state protection |
| `/admin/provider-status` | Verified admin page | Provider operations | Existing admin allowlist/cookie gate; no secret editing |

No separate Hopae-specific public route was added.
