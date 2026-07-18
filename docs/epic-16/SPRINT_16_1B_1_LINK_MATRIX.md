# Sprint 16.1B.1 Enterprise link matrix

Audit date: 2026-07-18. All destinations below were inspected in `C:\Users\emeae\Desktop\cyber-sentinels-clean` at commit `359c4452c3c70e8f7de9d78662d500f204c582a0`.

## Native Enterprise buyer-resource links

| Source file | Source route/surface | Visible label | Current destination | Type / tab | Leaves app | Query context | Target replacement | Status |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `app/enterprise/layout.tsx` via `enterpriseNavigation` | Every `/enterprise/*` page | Buyer Documentation | `/enterprise/buyer-documentation` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/layout.tsx` via `enterpriseNavigation` | Every `/enterprise/*` page | Pilot Checklist | `/enterprise/pilot-checklist` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/layout.tsx` via `enterpriseCtas.requestDemo` | Every `/enterprise/*` page | Request Demo | `/enterprise-access?intent=demo` | Internal / same | No | `intent=demo` | Preserve; add allowlisted buyer/source context | Pass with context gap |
| `app/enterprise/page.tsx` | `/enterprise` hero | Book Pilot | `/enterprise/pilot` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/page.tsx` | `/enterprise` hero | Buyer Documentation | `/enterprise/buyer-documentation` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/page.tsx` + `BuyerJourneyGrid` | `/enterprise#ciso` | Request Demo | `/enterprise-access?intent=demo` | Internal / same | No | Intent only; no `buyer=ciso` | Preserve; carry buyer/source | Gap |
| `app/enterprise/page.tsx` + `BuyerJourneyGrid` | `/enterprise#ciso` | Book Pilot | `/enterprise/pilot` | Internal / same | No | None | Preserve; carry buyer/source if supported | Pass with context gap |
| `app/enterprise/page.tsx` + `BuyerJourneyGrid` | `/enterprise#ciso` | Buyer Documentation | `/enterprise/buyer-documentation` | Internal / same | No | None | Preserve; carry buyer context | Pass with context gap |
| `app/enterprise/page.tsx` + `BuyerJourneyGrid` | `/enterprise#cio-cto` | Request Demo / Book Pilot / Buyer Documentation | Central CTA destinations | Internal / same | No | No buyer/source | Preserve; use `buyer=cto` | Gap |
| `app/enterprise/page.tsx` + `BuyerJourneyGrid` | `/enterprise#compliance` | Request Demo / Book Pilot / Buyer Documentation | Central CTA destinations | Internal / same | No | No buyer/source | Preserve; use `buyer=compliance` | Gap |
| `app/enterprise/page.tsx` + `BuyerJourneyGrid` | `/enterprise#ceo-investor` | Request Demo / Book Pilot / Buyer Documentation | Central CTA destinations | Internal / same | No | No buyer/source | Preserve; use `buyer=investor` | Gap |
| `app/enterprise/pilot/page.tsx` | `/enterprise/pilot` hero | Request Controlled Pilot | `/enterprise-access?intent=pilot` | Internal / same | No | `intent=pilot` | Preserve; add `source=pilot-checklist` only when reached from checklist | Pass |
| `app/enterprise/pilot/page.tsx` | `/enterprise/pilot` hero | Pilot Checklist | `/enterprise/pilot-checklist` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/buyer-documentation/page.tsx` | `/enterprise/buyer-documentation` hero | Request Demo | `/enterprise-access?intent=demo` | Internal / same | No | Intent only | Preserve; add `source=buyer-documentation` | Gap |
| `app/enterprise/buyer-documentation/page.tsx` | `/enterprise/buyer-documentation` hero | Book Pilot | `/enterprise/pilot` | Internal / same | No | None | Preserve; add source context if convention is approved | Pass with context gap |
| `app/enterprise/buyer-documentation/page.tsx` | `/enterprise/buyer-documentation` final evidence section | Request Demo | `/enterprise-access?intent=demo` | Internal / same | No | Intent only | Preserve; add source context | Gap |
| `app/enterprise/buyer-documentation/page.tsx` | `/enterprise/buyer-documentation` final evidence section | Pilot Checklist | `/enterprise/pilot-checklist` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/pilot-checklist/page.tsx` | `/enterprise/pilot-checklist` hero | Request Controlled Pilot | `/enterprise-access?intent=pilot` | Internal / same | No | Intent only | Preserve; add `source=pilot-checklist` | Gap |
| `app/enterprise/pilot-checklist/page.tsx` | `/enterprise/pilot-checklist` hero | Buyer Documentation | `/enterprise/buyer-documentation` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/pilot-checklist/page.tsx` | `/enterprise/pilot-checklist` final CTA | Request Controlled Pilot | `/enterprise-access?intent=pilot` | Internal / same | No | Intent only | Preserve; add source context | Gap |
| `app/enterprise/pilot-checklist/page.tsx` | `/enterprise/pilot-checklist` final CTA | Buyer Documentation | `/enterprise/buyer-documentation` | Internal / same | No | None | Preserve | Pass |

## Shared and adjacent Enterprise actions

| Source file | Source route/surface | Visible label | Current destination | Type / tab | Leaves app | Query context | Target replacement | Status |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `components/public-page-adoption-rail.tsx` + `lib/navigation/public-page-adoption.ts` | Canonical public routes except `/` and `/enterprise` | Request Demo | `/enterprise-access?intent=demo` | Internal / same | No | Intent only | Preserve; source context is optional and must remain non-authorizing | Pass |
| Same | Same | Book Pilot | `/enterprise/pilot` | Internal / same | No | None | Preserve | Pass |
| `app/layout.tsx` | Public footer | Pilot Programme | `/enterprise/pilot` | Internal / same | No | None | Preserve | Pass |
| `app/layout.tsx` | Public footer | Contact | `/enterprise-access` | Internal / same | No | None | Keep destination; standardize visible Enterprise CTA label where required | Pass with naming gap |
| `app/enterprise-access/page.tsx` | `/enterprise-access` | View Guided Demo | `/demo` | Internal / same | No | None | Preserve | Pass |
| `components/trust-transparency-report.tsx` | Protected trust report | Enterprise Summary | `/api/audit/export?...&format=pack-summary` | Internal download / same | No | Encoded workflow and subject; validated server-side | Preserve; do not add `/enterprise-summary` | Pass |
| `app/enterprise/control-plane/page.tsx` | Protected control plane | Enterprise readiness action | `/enterprise/readiness` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/compliance/page.tsx` | Protected compliance | Enterprise readiness action | `/enterprise/readiness` | Internal / same | No | None | Preserve | Pass |
| `app/enterprise/readiness/page.tsx` | Protected readiness | Download Enterprise Proof Pack | `/docs/ENTERPRISE_PROOF_PACK.md?download=1` | Intentional internal download | No | `download=1` | Preserve; unrelated to buyer/checklist Markdown | Pass |

## Detached, legacy and contradictory resource paths

| Source | Source route/surface | Visible/resource label | Current destination or exposure | Type / tab | Leaves app | Query context | Target replacement | Status |
| --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| `app/docs/[slug]/route.ts` allowlist | Direct request | `BUYER_JOURNEYS.md` | `/docs/BUYER_JOURNEYS.md` returns raw Markdown HTTP 200 | Internal raw document / same | No | None | Remove allowlist entry or redirect permanently to `/enterprise/buyer-documentation` | Invalid legacy exposure |
| `app/docs/[slug]/route.ts` allowlist | Direct request | `ENTERPRISE_PILOT_CHECKLIST.md` | `/docs/ENTERPRISE_PILOT_CHECKLIST.md` returns raw Markdown HTTP 200 | Internal raw document / same | No | None | Remove allowlist entry or redirect permanently to `/enterprise/pilot-checklist` | Invalid legacy exposure |
| `docs/BUYER_JOURNEYS.md` | Repository documentation | Documentation | Describes the tracked Markdown as the destination and says no buyer route exists | Documentation statement | N/A | Claims buyer context without implementation | Update to name the native route and canonical CTA contract | Stale |
| `docs/CONTENT_OWNERSHIP_MAP.md` | Repository documentation | Buyer journeys | Assigns ownership only to `/enterprise#...` and forbids buyer routes | Documentation statement | N/A | None | Update ownership to `/enterprise/buyer-documentation` while keeping overview summaries | Stale/conflicting |
| `docs/ENTERPRISE_PILOT_KIT.md` | Repository documentation | Pilot checklist | `/pilot/getting-started` | Internal protected operator guide | No | None | Clarify that public buyer checklist is `/enterprise/pilot-checklist`; keep protected onboarding separate | Ambiguous ownership |
| `docs/ROUTE_INVENTORY.md` and `docs/ROUTE_MAP.md` | Repository documentation | Route records | Target routes absent | Documentation inventory | N/A | None | Add/regenerate records for both native pages | Stale |

## External-navigation classification

| Location | Behavior | Classification | Enterprise buyer action |
| --- | --- | --- | --- |
| `app/back-office/page.tsx` (3) | Dynamic evidence URL, `_blank`, `noreferrer` | Intentional protected evidence resource | None |
| `app/evidence-vault/page.tsx` (1) | Dynamic evidence URL, `_blank`, `noreferrer` | Intentional protected evidence resource | None |
| `app/layout.tsx` | Adds `_blank` only when a footer URL starts with `http` | Valid generic branch; dormant for the current all-internal footer | None |
| `lib/supabase/client.ts` | `window.location.assign('/login?next=/command-center')` | Intentional same-origin auth redirect | None |
| Login/verify-email | Reads `window.location` to build same-origin callbacks and parse safe `next` paths | Auth behavior, not external navigation | None |

No Buyer Documentation or Pilot Checklist link opens a new tab, uses `window.location`, leaves the application or points to GitHub. No `window.open`, literal `location.href` or HTML `download` attribute was found.

## Matrix conclusion

The canonical native links pass. Part 2 should modify the existing centralized destinations to carry allowlisted buyer/source context, add the missing Contact Enterprise action, update each buyer card to end with the required three internal actions on the Buyer Documentation page, and retire the two direct raw Markdown exposures. No new public route is required.
