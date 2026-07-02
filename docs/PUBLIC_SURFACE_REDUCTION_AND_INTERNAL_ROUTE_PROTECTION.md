# Public Surface Reduction and Internal Route Protection

Date: 2 July 2026

## Audit scope

The application route inventory contains 209 page routes and 107 API route
handlers. Classification is applied in the following order so every current and
future matching route has one exposure policy:

1. Admin Only
2. Internal Only
3. Experimental
4. Auth Required
5. Public

API handlers retain their own authorization, signature, API-key and validation
checks. Middleware adds a perimeter boundary for admin, internal and
experimental families; it does not replace route-level authorization or RLS.

## Route classification

### Public

Public exposure is limited to the enterprise story, legal/security information,
account access, controlled demonstrations and public-safe verification:

- `/`
- `/about`, `/about/*`, `/about-us`
- `/accessibility`, `/careers`, `/cookies`, `/legal`, `/privacy`, `/terms`
- `/corporate-sustainability`, `/sustainability`, `/modern-slavery*`
- `/security`, `/regulatory`, `/transparency`, `/ai-governance`
- `/platform`, `/methodology`, `/operational-principles`, `/trust-principles`
- `/enterprise`, `/enterprise/hiring-security`, `/enterprise/pilot`
- `/enterprise/demo-stories`, `/enterprise/walkthrough`, `/enterprise-access`
- `/design-partner`, `/design-partners`, `/pricing`, `/pro-waitlist`
- `/demo`, `/demo/hiring-attack`, `/demo/session-integrity`
- `/replay/demo`, `/verification/receipt/demo`
- `/trust`, `/trust-posture`, `/governance`, `/verification-replay`
- `/verification-receipts`, `/verify`, `/verify/[id]`
- `/embed/[id]`, `/seal/[id]`
- `/help`, `/how-to-use`, `/login`, `/verify-email`, `/reset-password`
- `/investor`, `/funding`, `/journal`, `/media-centre`, `/our-people`,
  `/why-now`

Public API exposure remains limited to explicitly public-safe verification,
embed, seal, health, intake, webhook or API-key-controlled handlers. Public
routes must return summaries rather than private evidence, reviewer notes,
provider secrets or internal configuration.

### Auth Required

Authenticated user workflow families include:

- `/agents/*`
- `/billing`, `/clearances`, `/client-portal`, `/compliance-export`
- `/dashboard/*` except admin-classified validation tooling
- `/data-rights`, `/evidence-upload`, `/feedback`, `/help` submissions
- `/hiring-shield`, `/interview/session/*`
- `/knowledge-base`, `/messages`, `/notifications`, `/appeals`
- `/passport`, `/passports/*`
- `/pilot/*`, `/enterprise/pilot-setup`
- `/recruiter/dashboard`
- `/replay/*` except `/replay/demo`
- `/team-access`, `/team-workspace`, `/timeline`
- `/trust/*` except the public `/trust` overview
- `/trust-assistant`, `/trust-center`, `/trust-replay`
- `/verification/receipt/*` except the demo receipt
- `/verifier-network`
- `/verify/candidate`, `/verify/recruiter`, `/verify/provenance`,
  `/verify/session`
- `/workspace/*`

These routes receive `X-Robots-Tag: noindex, nofollow, noarchive` and
`Cache-Control: private, no-store` from middleware.

### Admin Only

Admin-only operational families include:

- `/admin/*`
- `/back-office`
- `/enterprise/control-plane`, `/enterprise/auditability`,
  `/enterprise/readiness`, `/enterprise/compliance`,
  `/enterprise/identity-governance`, `/enterprise/consortium`
- `/verification-queue`, `/evidence-vault`
- `/decision-engine`, `/trust-intelligence`, `/trust-graph-engine`
- `/mission-control`, `/signals`, `/workforce-trust`
- `/intent-verification`, `/autonomy-governance`, `/execution-passports`
- `/state-verification`, `/trust-events`, `/trustops`, `/launch-control`
- `/api/admin/*`

The requested `/founder-control` and `/verification-testbench` root routes do
not exist. Their canonical implementations remain
`/admin/founder-control` and `/admin/verification-testbench`.

### Internal Only

Internal tooling stays at its existing compatibility URL but now requires the
full admin boundary:

- `/api-docs`
- `/architecture`
- `/command-center`
- `/demo-lab`
- `/developer-console`, `/developers/*`
- `/launch-console`
- `/qa-console`
- `/status`, `/status/verification`
- `/dashboard/validation`
- `/api/demo/seed`
- `/api/providers`, `/api/status`
- experimental analysis APIs for AI governance, human-presence, origin,
  reality-twin, trust-algorithm, trust-events and trust-recovery

The controlled public demo remains available at `/demo`; only the service-role
seed lab moved behind admin access.

### Experimental

Experimental and legacy trust abstractions remain functional but are protected
by the admin boundary and excluded from indexing:

- `/agent-passport`, `/agent-registry/*`
- `/deepfake-detection`, `/linkedin-verification`, `/video-verification`
- `/human-presence-genome`, `/human-presence-index`
- `/origin-dna`, `/origin-trace`
- `/reality-chain`, `/reality-os`, `/reality-passport`, `/reality-twin`
- `/synthetic-counterpart`
- `/global-trust`, `/marketplace-trust`
- `/permissions-firewall`, `/policy-engine`, `/revocation-engine`,
  `/step-up-verification`
- `/profile`, `/profile/*`
- `/trust-algorithm`, `/trust-badges`, `/trust-embeds`
- `/trust-evaluation-lab`
- `/trust-fabric`, `/trust-feed`, `/trust-graph`,
  `/trust-graph-explorer`, `/trust-ledger`, `/trust-os`
- `/trust-prediction`, `/trust-radar`, `/trust-recovery`,
  `/trust-registry`, `/trust-seal-authority`, `/trust-timeline/*`

No functionality was deleted and no duplicate `/internal/*` route tree was
created.

## Protected tooling

Middleware now:

- evaluates every non-static request through one route classifier;
- requires authenticated, verified, allowlisted and admin-cookie access for
  admin, internal and experimental routes;
- fails closed with HTTP 503 when protected routes cannot initialize auth
  configuration;
- clears admin state on denied access;
- routes denied admin checks through the existing Back Office access gate; and
- protects the demo seed and provider/status diagnostic endpoints.

Route-level admin checks and database RLS remain authoritative.

## Indexing protections

`app/robots.ts` disallows admin, internal, validation, diagnostics and
experimental route families.

Middleware additionally sends:

- `X-Robots-Tag: noindex, nofollow, noarchive`
- `Cache-Control: private, no-store`

on every protected response and redirect. Robots policy is a discovery control;
authorization remains the security boundary.

## Navigation and discovery

Public primary navigation remains:

- Platform
- Hiring Security
- Trust Center
- Enterprise
- Pricing
- Access

Architecture and Trust Lab links were removed from public discovery. Funding,
build-plan and founder-journal links were removed from the global footer.
Public Verify and Help no longer advertise internal consoles, trust graph
tooling or API documentation. Admin tooling remains discoverable from protected
Back Office surfaces.

## Enterprise-safe exposure policy

Public copy should describe:

- Operational Trust
- replayable evidence
- governance continuity
- workflow integrity
- enterprise Trust Posture

Public pages should not name database vendors, environment variables, internal
tables, service-role behavior, provider credential requirements, orchestration
internals or experimental architecture. Security copy now describes row-level
access controls without exposing the database vendor.

## Remaining boundaries

- Public-safe verification, embed and seal endpoints still require periodic
  field-level response review.
- Webhooks continue to depend on provider signature validation and deployment
  secret configuration.
- API-key-controlled trust endpoints require durable production rate limiting
  before broader external release.
- Deployed-role testing is still required for anonymous, authenticated,
  unverified-admin and verified-admin navigation.
- Search-engine removal of previously indexed legacy URLs depends on crawler
  recrawl after deployment.
