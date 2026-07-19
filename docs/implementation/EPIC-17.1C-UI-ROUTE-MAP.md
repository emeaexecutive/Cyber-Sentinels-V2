# EPIC 17.1C UI and Route Map

| Surface | Backing contract | Authentication | Tenant enforcement | Primary states |
| --- | --- | --- | --- | --- |
| `/dashboard/identity` | `GET /api/identity/verifications?page=&pageSize=` | Server redirect plus API session | `X-Enterprise-Id` membership | loading, empty, partial, completed, failed, blocked, unauthorized |
| `/dashboard/identity/verifications/:id` | `GET /api/identity/verifications/:id` | Server redirect plus API session | Request and evidence filtered by enterprise | loading, empty evidence, partial/completed/failed request, unauthorized |
| `/dashboard/identity/providers` | `GET /api/identity/providers`; `GET /api/identity/providers/health` | Server redirect plus API session | Capability overrides and runtime evidence scoped to enterprise | loading, empty registry, degraded, disabled, blocked, unauthorized |
| `/dashboard/identity/operations` | `GET /api/operations/status` | Server redirect plus API session | Authorized enterprise context required | loading, blocked external controls, not configured, unauthorized |

## Required API inventory

| Method and route | Purpose |
| --- | --- |
| `GET /api/identity/providers` | Registry, configuration and persisted capability truth |
| `GET /api/identity/providers/health` | Safe live health and persisted execution readiness |
| `GET /api/identity/verifications` | Paginated dashboard snapshot |
| `GET /api/identity/verifications/:id` | Verification, transaction, evidence and confidence detail |
| `GET /api/identity/subjects/:id/signals` | Tenant-scoped subject evidence history |
| `GET /api/identity/subjects/:id/confidence` | Latest tenant-scoped provisional confidence |
| `GET /api/operations/status` | Evidence-bound operational-control classification |

## Component inventory

- `components/identity-signals/identity-dashboard.tsx`
- `components/identity-signals/verification-detail.tsx`
- `components/identity-signals/provider-operations.tsx`
- `components/identity-signals/operations-status.tsx`
- `lib/identity-signals/presentation.ts`
- `lib/identity-signals/ui-enterprise.ts`

The client components receive only the authorized enterprise identifier selected by the server page. Every data fetch repeats authentication and tenant authorization at the API boundary.
