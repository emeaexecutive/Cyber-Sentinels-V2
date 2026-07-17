# Hopae configuration

Server-only variables:

| Variable | Purpose |
|---|---|
| `HOPAE_ENABLED` | Deployment kill switch. |
| `HOPAE_ENVIRONMENT` | `sandbox` or `production`. |
| `HOPAE_API_BASE_URL` | Must be `https://sandbox.api.hopae.com` for sandbox or `https://api.hopae.com` for production. |
| `HOPAE_CLIENT_ID` / `HOPAE_CLIENT_SECRET` | REST Basic-auth credentials. |
| `HOPAE_WEBHOOK_SECRET` | HMAC callback secret. |
| `HOPAE_PROVIDER_ID` | Server-approved Hopae eID; never accepted from the browser. |
| `HOPAE_CALLBACK_TOLERANCE_SECONDS` | 30-900; default 300. |
| `HOPAE_REQUEST_TIMEOUT_MS` | 1000-30000; default 8000. |
| `HOPAE_MAX_RETRIES` | 0-3 safe-method retries; default 2. |

Missing or invalid values produce `MISCONFIGURED`; disabled produces `DISABLED`. Production with a sandbox endpoint and sandbox with a production/custom endpoint are rejected. Secret values never appear in status responses or logs. After environment configuration, apply the migration and perform an audited registry enablement.
