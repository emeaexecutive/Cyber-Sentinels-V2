# Trust Alerts and Manual Review

Alerts extend the existing `trust_alerts` table. EPIC 24 adds summary, reason codes, signal IDs, and a policy-decision reference. Alert history is append-only.

Workflow:

```text
OPEN -> ACKNOWLEDGED -> INVESTIGATING -> RESOLVED
  \             \             \------> DISMISSED
   \----------------------------------> DISMISSED
```

Closed alerts cannot transition again. All mutations require a reviewer, administrator, or owner, a note, tenant scope, an audit record, and a canonical Replay event.

Endpoints:

- `GET /api/trust/alerts`
- `GET /api/trust/alerts/{id}`
- `POST /api/trust/alerts/{id}/acknowledge`
- `POST /api/trust/alerts/{id}/resolve`
- `POST /api/trust/alerts/{id}/dismiss`

Manual reviews use `REQUESTED`, `ASSIGNED`, `IN_REVIEW`, `APPROVED`, `REJECTED`, and `CANCELLED`. The queue is tenant-scoped. Every decision requires a reason and is recorded in `trust_manual_review_history`, audit, and Replay. A review result is governance evidence; any resulting trust change must still pass through the canonical assessment/state path.

Operational priority:

- Critical/high alert: acknowledge, inspect Replay and referenced signals, assign review, resolve only with a reason.
- Provider outage: inspect provider health first; do not classify subjects as fraudulent.
- Repeated processing failure: inspect `trust_processing_failures` and dependency health, then submit a new auditable signal if the terminal job must be retried.
