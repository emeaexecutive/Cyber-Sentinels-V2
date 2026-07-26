# Enterprise Trust Graph API

## Common contract

Every route requires an authenticated session and a valid `X-Enterprise-Id` header. Mutations additionally require `application/json`, same-origin browser context, and an owner, admin, or reviewer role. Admin routes require owner or admin.

Responses use schema version `trust-intelligence-v1`, include a correlation ID, and set `Cache-Control: private, no-store`.

## Entity APIs

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/trust/entity/{id}` | Read one entity |
| GET | `/api/trust/entity/{id}/summary` | Evidence/relationship/provider summary |
| GET | `/api/trust/entity/{id}/timeline` | Bounded event and evidence chronology |
| GET | `/api/trust/entity/{id}/graph` | Root, neighbours, relationships and evidence |
| POST | `/api/trust/entity` | Create an entity and `ENTITY_CREATED` event |
| PATCH | `/api/trust/entity/{id}` | Version-checked update and event |

Create request:

```http
POST /api/trust/entity
Content-Type: application/json
X-Enterprise-Id: 11111111-1111-4111-8111-111111111111

{
  "entityType": "AI_AGENT",
  "entityName": "Procurement Review Agent",
  "metadata": {
    "environment": "production"
  }
}
```

Update request:

```http
PATCH /api/trust/entity/44444444-4444-4444-8444-444444444444
Content-Type: application/json
X-Enterprise-Id: 11111111-1111-4111-8111-111111111111

{
  "expectedVersion": 3,
  "status": "SUSPENDED"
}
```

A stale `expectedVersion` returns a conflict and writes no event.

## Evidence API

The existing continuous-trust `GET /api/trust/evidence` remains unchanged. EPIC 21 adds `POST` to the same route.

```http
POST /api/trust/evidence
Content-Type: application/json
X-Enterprise-Id: 11111111-1111-4111-8111-111111111111

{
  "entityId": "44444444-4444-4444-8444-444444444444",
  "source": "provider:hopae",
  "provider": "hopae_connect",
  "evidenceType": "IDENTITY",
  "confidence": 0.92,
  "metadata": {
    "reference": "provider-result-reference"
  }
}
```

Raw provider payloads are not accepted by the graph contract.

## Relationship APIs

| Method | Route | Purpose |
| --- | --- | --- |
| POST | `/api/trust/relationship` | Create a version-1 relationship and event |
| DELETE | `/api/trust/relationship/{id}` | Non-destructive relationship removal |

Delete requires `If-Match` containing the current integer version:

```http
DELETE /api/trust/relationship/55555555-5555-4555-8555-555555555555
If-Match: 1
X-Enterprise-Id: 11111111-1111-4111-8111-111111111111
```

## Admin APIs

- `GET /api/admin/trust-graph/system-health`
- `GET /api/admin/trust-graph/provider-health`
- `GET /api/admin/trust-graph/relationship-statistics`
- `GET /api/admin/trust-graph/entity-statistics`
- `GET /api/admin/trust-graph/tenant-statistics`

Metrics are database-derived. Empty data returns zero counts, not invented activity.

## Errors

Client errors expose safe codes such as `UUID_INVALID`, `VERSION_INVALID`, `ENTITY_NOT_FOUND`, and `VERSION_CONFLICT`. Server failures return a generic message and log only the operation and error code.

## Extension points

New APIs must use the shared graph context, validation, response, and failure helpers; call `TrustGraphService`; add API tests; retain bounded reads; and avoid direct provider-specific or route-local persistence.
