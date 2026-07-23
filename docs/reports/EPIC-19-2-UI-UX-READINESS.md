# EPIC 19.2 UI/UX Readiness

Date: 2026-07-23
Branch: `epic-19-2-cookie-preferences-ui-ux`
Starting commit: `7f5c3bacd2e37c259c4e6352d6e8128b5cf90142`

This is a repository and local-runtime assessment, not a production certification. A feature is not classified as complete when live provider execution, deployed migrations, tenant-denial proof, or an authenticated end-to-end workflow was unavailable.

## Cookie preferences result

The original preferences overlay was fixed to the viewport, but it did not provide a centring layout. Its child dialog had no viewport maximum height and no internal scroller. A second runtime cause was found during browser verification: `tailwind.config.ts` did not scan `src/`, where the consent components live, so unique utilities could be absent from the generated CSS.

The repaired implementation provides:

- a `fixed`, full-viewport, `z-[10000]` overlay with a dark 80% slate backdrop and restrained blur;
- flex centring, viewport padding, and safe-area padding;
- a `max-w-2xl`, `max-h-[90dvh]`, explicit elevated dialog surface;
- an internal overscroll-contained vertical scroller;
- a persistent, labelled close control;
- labelled and described modal semantics;
- focus entry, focus containment, Escape dismissal, focus return, background interaction blocking, and body scroll locking;
- backdrop dismissal that closes only the preferences layer; an undecided first-choice banner remains governed by the existing non-dismissible policy;
- one-column mobile actions and two-column wider actions with 44px minimum targets;
- responsive category layout and an always-checked, disabled Essential switch;
- immediate asynchronous receipt submission after the local decision is stored, while receipt failure remains non-blocking and optional tracking remains fail-closed.

The consent categories, policy version, local receipt schema, timestamps, idempotency key, retry schedule, server receipt contract, and Supabase schema were not changed.

## UI foundation check

| Foundation | Repository state | EPIC 19.2 action |
|---|---|---|
| Page background | `--brand-canvas` | Reused |
| Elevated/card surfaces | `--brand-surface`, `--brand-surface-raised`, `operational-panel`, `operational-card` | Reused for consent |
| Borders | `--brand-border`, `--brand-border-strong` | Reused |
| Text hierarchy | Global zinc contrast adjustments and shared typography | Reused |
| Buttons | `brand-primary-action`, `brand-secondary-action`, local consent variants | Preserved; consent primary contrast improved |
| Focus ring | Global `:focus-visible` rule | Preserved |
| Shared page container | Repeated `max-w-*` conventions, no single component | No new competing abstraction |
| Shared dialog | No general trusted dialog primitive or library | Not introduced in this contained fix |
| Empty/loading/error states | `enterprise-empty-state`, `enterprise-loading-state`, route loading/error modules | Existing foundation confirmed |
| Success/warning/risk | Repeated semantic status classes, not a complete token layer | No second status system introduced |
| Tailwind discovery | `app/`, `components/`, `lib/` only | Added `src/` so existing source components compile their utilities |

## Safe UI/UX fixes implemented

- Repaired cookie preference visibility, centring, viewport bounds, internal scrolling, mobile actions, category layout, focus behavior, and backdrop separation.
- Added `src/` to Tailwind content discovery after browser evidence proved those styles were omitted.
- Replaced public authentication provider/runtime error leakage with bounded user-facing messages while retaining detailed console diagnostics.
- Removed the public login message that named Vercel environment configuration.
- Added accessible live status feedback to login and email-verification flows.
- Added an explicit accessible label to the email-verification input.
- Increased authentication mode and footer cookie-preference controls to comfortable touch targets.

## UI/UX findings documented but not changed

- The application has a very large route surface with compatibility, experimental, demo, and placeholder routes. Existing canonical-route and middleware controls reduce exposure, but route consolidation is still needed.
- Public content includes clearly disclosed simulated or placeholder capability descriptions. Removing them requires product-scope decisions, not a polish patch.
- No shared general-purpose dialog primitive exists. Introducing one would require migrating and regression-testing multiple independent dialogs.
- Several protected or provider-backed views cannot demonstrate their intended authenticated empty/loading/error states in the current local environment.
- Some legal pages explicitly describe draft or placeholder clauses. Legal approval and final copy are outside this sprint.
- Exact Replay is not yet version-pinned across every policy, provider result, configuration, risk model, and Trust Memory input.
- A small number of older feature surfaces still accept operator-entered scores or demo fixtures. They must not be presented as provider-verified evidence.

## A. WORKING NOW

The following are working at repository/local-test level, with the limitations stated:

| Capability | Evidence-backed assessment |
|---|---|
| Cookie choice and local persistence | Accept, reject, custom save, reopen, version/expiry handling, and necessary-category enforcement pass local tests |
| Consent receipt recovery | Immediate attempt, bounded retry, terminal failure behavior, signed cookie, append-only receipt model, and fail-closed optional tracking pass local tests |
| Public navigation/footer | Canonical six-link header, accessible mobile disclosure, detailed footer, and cookie preferences trigger are source-tested |
| UI foundations | Explicit dark surfaces, focus rings, shared operational cards, loading states, empty states, and root error boundary exist |
| Canonical Trust Events | Signed event chain, schema contracts, ingestion/service logic, and source-level tests exist |
| Provider-neutral consensus engine | Deterministic engine, health/conflict handling, APIs, UI components, migrations, and tests exist; live multi-provider proof remains partial |
| Billing mechanics | Stripe checkout, portal, signed webhook processing, event reservation, and subscription persistence code exist; live commercial verification is environment-dependent |
| Notification centre | Authenticated data query, grouping, unread handling, audit write, empty state, and loading state exist |

## B. PARTIALLY IMPLEMENTED

| Capability | Current state | Principal limitation |
|---|---|---|
| Human identity verification | Supabase account identity, Hopae adapter, normalization, identity dashboards, verification request/evidence records | No live end-to-end provider execution in this audit |
| AI agent verification | Registry, passports, ownership, runtime context, delegated authority, lineage, revocation/enforcement models | No cryptographic model attestation or complete external tool enforcement |
| Trust Passport | Data-backed passport list/detail/API, decisions, evidence, notifications, audit/report links | Legacy/manual score paths remain; provider-complete evidence workflow not proved |
| Trust Memory | Append-only models, API, admin view, integrity/chronology tests | Live retention, deletion, scale, and migration proof missing |
| Trust DNA | Living Trust Profile dimensions, coverage/evolution UI, authority and risk explanations | It is a presentation of available evidence, not an independently verified identity/genetic construct |
| Replay | Snapshots, as-of chronology, writer, APIs, UI, audit/replay references | Exact bit-for-bit computational replay is not yet proven |
| Evidence Graph | Typed nodes/edges, query/build logic, admin view, architecture integration | Live graph population, customer-facing traversal, and tenant denial proof missing |
| Authority lineage | Authority graph, grants/delegation, decision contracts, governance lineage | External action enforcement and revocation propagation unproved |
| Provider-neutral consensus | Deterministic provider independence, conflicts, health, policy, APIs/UI | Live independent multi-provider observations and deployed schema unproved |
| Device identity/context | Device continuity and runtime/session fields | Not an independently validated fingerprint service |
| Document verification | Hopae/provider capability contracts and evidence normalization | No live authoritative document verification result |
| Liveness | Provider signal vocabulary/mapping plus disclosed simulated legacy paths | No authoritative live result or validated proprietary detector |
| Audit trail | Trust Events, audit logs, receipts, Replay, Evidence Graph, export routes | Live append-only/retention/backup proof incomplete |
| Report generation | Trust reports, receipts, evidence packs, print/export routes | Production data completeness and customer acceptance unproved |
| Governance | Review queues, policies, actions, decision records, audit linkage | External enforcement, enterprise SSO/RBAC proof, and live queue operation incomplete |
| Integrations | Real Hopae boundary, generic/Atlast ATS workflow, signed callbacks, receipt export | Credentials, provider sandbox/live checks, and customer endpoints unavailable |
| Enterprise administration | Protected admin routes, allowlist/step-up, provider/readiness/governance views | Distributed controls, SSO/SCIM, and authenticated browser proof missing |
| Tenant isolation | Tenant-aware repositories plus broad RLS migrations and static denial tests | Live two-tenant denial test against the deployed schema missing |
| Billing | Stripe implementation and schema | Live price/product/webhook configuration and end-to-end purchase not verified |
| Notification handling | In-app notification records and operational updates | External email/SMS delivery and production operating proof missing |

## C. VISUAL ONLY / PLACEHOLDER

| Capability | Repository truth |
|---|---|
| Device fingerprinting | Provider registry/planned signal only; no production fingerprint service |
| Email reputation | Provider-independent capability group and placeholder registry entries only |
| Phone verification/reputation | Signal vocabulary/foundation only; no production-proven flow |
| First-party deepfake detection | UI, provider registry, simulations, and validation scaffolding exist; no validated proprietary production detector |
| Face matching | Mapped provider capability without live proof |
| VPN/proxy/Tor detection | Derived/simulated foundation without authoritative commercial-feed execution |
| Stripe Identity | Placeholder identity-provider entry; billing Stripe is separate and real |
| World ID verification | Proof-shape validation exists, but provider verification returns `501` |
| Persona, Entrust, Onfido | Registry definitions only |
| Selected public demos and seals | Explicit synthetic fixtures intended for demonstration, not customer evidence |

## D. MISSING

- Production SCIM.
- Production-proven SSO federation.
- A complete AI-agent credential lifecycle and cryptographic model/provider attestation.
- Durable distributed retry/dead-letter processing for every Replay and provider side effect.
- Independently validated biometric, liveness, deepfake, email-reputation, phone-reputation, or device-fingerprint accuracy.
- Completed backup/restore and disaster-recovery exercise evidence.
- A final approved legal copy set for pages explicitly marked as drafts/placeholders.

## E. BLOCKED BY ENVIRONMENT OR PROVIDER

- Current validation shell is Node `26.1.0`; the repository requires Node `22.x`.
- `npm ci` reports two high-severity production dependency findings.
- The local protected routes `/dashboard`, `/passports`, `/admin`, and `/admin/integrations` returned HTTP 503 without an operable authenticated Supabase context.
- Latest migrations and live two-tenant RLS denial checks were not run against an approved linked database.
- Hopae live/sandbox identity execution was not authorized/configured.
- Production readiness and deployed-security checks require an approved staging/production context.
- GitHub CLI is installed but not authenticated.
- The in-app browser connection was unavailable; local Edge/CDP fallback supplied the browser evidence below.

## F. RECOMMENDED NEXT BUILD ORDER

1. Complete one real verification case workflow from intake through provider evidence, human review, Replay, and receipt.
2. Make Trust Passport evidence-driven and remove/manual-bound legacy score paths from the canonical customer workflow.
3. Deliver a customer-facing Evidence Graph view tied to the same case, decision, Replay, authority lineage, and exportable evidence references.

Detailed scope is in `docs/reports/EPIC-20-RECOMMENDED-FEATURE-SPRINT.md`.

## Manual verification evidence

Local application: `http://127.0.0.1:3000` using headless Microsoft Edge fallback.

### Cookie interaction results

| Check | Result |
|---|---|
| First-visit banner on homepage | Passed |
| Footer cookie-preferences trigger | Passed |
| Reopen after saved choice | Passed; saved Analytics choice restored |
| Essential category | Passed; checked and disabled |
| Focus entry | Passed; labelled close control receives focus |
| Focus trap | Passed; Tab from final action wraps to close control |
| Escape | Passed; closes preferences and returns focus to footer trigger |
| Backdrop click | Passed; closes only the preferences layer |
| Body scroll lock | Passed; body overflow is hidden while open |
| Receipt outage | Local choice dismissed the dialog and kept the banner closed; local receipt moved to `retry_scheduled` after the local API returned 403 |
| Horizontal overflow | None at the six required viewports |

### Required viewport measurements

| Viewport | Dialog top/bottom | Dialog height | Internal content | Result |
|---|---:|---:|---:|---|
| 320 × 568 | 28 / 540 | 511 | 509 client / 4004 scroll | Passed |
| 375 × 667 | 33 / 634 | 600 | 598 client / 3725 scroll | Passed |
| 390 × 844 | 42 / 802 | 760 | 758 client / 3680 scroll | Passed |
| 768 × 1024 | 51 / 973 | 922 | 920 client / 2329 scroll | Passed |
| 1280 × 720 | 36 / 684 | 648 | 646 client / 2329 scroll | Passed |
| 1440 × 900 | 45 / 855 | 810 | 808 client / 2329 scroll | Passed |

At 320 × 568, scrolling the internal container to the end made all four actions reachable while the close control remained visible.

### Routes checked

| Route | Result |
|---|---|
| `/` | HTTP 200; homepage and first-choice consent verified |
| `/login` | HTTP 200; sign-in/create-account UI rendered |
| `/governance` | HTTP 200; public governance explanation rendered |
| `/verification-receipts` | HTTP 200; receipt explanation/search surface rendered |
| `/privacy/preferences` | HTTP 200; dedicated preference centre available |
| `/dashboard` | HTTP 503 in the current unauthenticated/provider environment |
| `/passports` | HTTP 503 in the current unauthenticated/provider environment |
| `/admin` | HTTP 503 in the current unauthenticated/provider environment |
| `/admin/integrations` | HTTP 503 in the current unauthenticated/provider environment |

## Security review of this change

- No environment variable or Supabase schema was changed.
- No service-role or private key is referenced by the changed client code.
- No authentication, middleware, RLS, CSP, consent protection, or redirect rule was weakened.
- No unsafe HTML rendering was introduced.
- Consent background synchronization remains origin-controlled and idempotent.
- Public authentication messages now expose less provider/runtime detail.
- Consent failure logging retains operational category/status only and does not add personal information.

## Validation results

| Command | Result |
|---|---|
| `npm ci` | Passed; 450 packages installed; warned that Node 26.1.0 does not satisfy required Node 22.x |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm run test:cookie-consent` | Passed, 13/13 |
| `npm run test:consent` | Passed, 35/35 |
| `npm run test:ui-ux` | Passed, 2/2 |
| `npm test` | Passed, 366/366 aggregate tests |
| `npm run build` | Passed; Next.js 15.5.21 generated 183 static pages |
| `npm audit --omit=dev` | Failed release gate: 2 high-severity findings (`sharp`, inherited by `next`) |

The tests emit the pre-existing `MODULE_TYPELESS_PACKAGE_JSON` warning under Node's TypeScript-strip path.

## Release position

The cookie preference UI is ready for code review. The application is **not production-ready** because the Node runtime mismatch, two high-severity dependency findings, protected-route 503s, live migration/RLS proof, and provider execution remain unresolved.
