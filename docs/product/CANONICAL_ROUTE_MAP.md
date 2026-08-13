# Canonical route map

The repository contains a broad historical surface. The canonical product is deliberately small; route existence does not imply product readiness.

## Canonical user journey

| User intent | Canonical route | Access |
| --- | --- | --- |
| Understand current posture | `/dashboard` | Authenticated |
| Find governed actors | `/operational-entities` | Authenticated |
| Inspect an actor | `/operational-entities/[entityId]` | Authenticated, tenant-scoped |
| Review decisions / transactions | `/trust/transactions` | Authenticated |
| Inspect a transaction | `/trust/transactions/[transactionId]` | Authenticated, tenant-scoped |
| Review evidence | `/evidence` | Authenticated |
| Replay change | `/trust-replay` | Authenticated |
| Integrate | `/developers` | Public docs; authenticated API-key management |
| Manage identity and organisation | `/account` | Authenticated |

Public acquisition remains `/`, `/platform`, `/solutions`, `/trust`, `/enterprise`, `/pricing`, then `/login`.

## Exhaustive classification contract

Every `app/**/page.tsx` route is classified by `lib/navigation/route-classification.ts` as exactly one of:

- `CANONICAL_PRODUCT`
- `PUBLIC_MARKETING`
- `AUTH_ACCOUNT`
- `DEVELOPER`
- `ADMIN_INTERNAL`
- `DEMO_PILOT`
- `EXPERIMENTAL`
- `LEGACY_DUPLICATE`
- `PLACEHOLDER_DEAD`

`tests/product-route-classification.test.mjs` walks the App Router inventory and fails if the classification contract is absent or invalid. Its fail-closed default is `PLACEHOLDER_DEAD`: a new page does not become a product promise merely because it compiles.

## Consolidation rules

- Canonical navigation may link only to the table above (plus notifications and explicit admin access).
- Legacy, experimental, demo, and internal routes are never promoted through global navigation.
- Existing legacy URLs remain available only for compatibility while their data engines stay canonical; no duplicate trust engine, registry, evidence store, or replay engine may be introduced.
- A route can move classifications only with an explicit classifier change, a user-journey rationale, access-control coverage, and tests.
