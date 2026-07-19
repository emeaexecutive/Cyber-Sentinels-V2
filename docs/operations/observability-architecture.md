# Observability Architecture

**Status:** Proposed target with partial runtime telemetry

## Objectives

Observability must answer what failed, who/which tenant was affected, whether trust or authorization changed, which deployment/configuration caused it, and whether recovery succeeded—without copying sensitive evidence into telemetry.

## Signal model

| Signal | Current source | Target retention |
| --- | --- | --- |
| Application logs | Vercel/runtime console | Central structured log store |
| Audit events | Supabase audit/trust/provider tables | Append-only policy with access review |
| Metrics | In-process profiler plus `operational_measurements` writes | Durable time series and SLO dashboards |
| Traces | Correlation IDs in selected paths | Distributed trace context across API/provider/database stages |
| Deployment events | Vercel/Git release records | Release dashboard linked to SHA and incidents |

## Required common fields

Timestamp, environment, build SHA, service/route, operation, outcome, duration, safe error category, correlation ID, tenant reference when authorized, provider/source mode and retry count. Do not log tokens, secrets, raw identity documents, biometrics, provider payloads, report content, free text or full personal identifiers.

## Required metrics

- Request volume, error rate and latency by critical route.
- Authentication failures, session expiry and admin denials.
- Provider availability, latency, timeout, signature and callback failures.
- Evidence ingestion, duplicate/rejected evidence and backlog.
- Trust Decision, policy, authority and enforcement failures/latency.
- Replay, Evidence Graph, Trust Memory and report latency/failures.
- ORI latency, abstention and persistence failures without accuracy overclaim.
- Database errors, saturation, slow queries and migration failures.
- Deployment/build/smoke failures and rollback frequency.

## Dashboards and SLOs

Create separate executive, release, trust-runtime, provider, database and security views. Thresholds become SLOs only after representative baseline evidence and owner approval. Process-local samples are diagnostic and must not be presented as fleet percentiles.

## Access and retention

Use least privilege and audited access. Security owns sensitive-log policy, Operations owns platform telemetry, and domain owners own service metrics. Retention is purpose-specific; evidence/audit retention is not automatically the same as performance telemetry.

## Current limitations

No centralized APM, trace backend, alert routing or verified retention/access configuration is present in the repository. Durable telemetry writes are asynchronous and do not prove complete delivery.
