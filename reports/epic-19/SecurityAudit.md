# EPIC 19.1 Security Audit

## Gate findings

### CRITICAL

1. `npm audit --omit=dev` reports two high-severity production advisories through `sharp` 0.34.5. No non-breaking compatible remediation was identified.
2. Production `/api/ready` returns 503 and reports the Enterprise Trust Domain Registry incomplete and external control-plane evidence blocked.
3. Live Supabase migration and tenant-isolation execution is unproved.

### HIGH

1. Vercel runtime is inconsistent: project Node 24.x, application Node 22.x, middleware Node 24.x.
2. Authoritative live provider callback and end-to-end identity verification were not tested.
3. Experimental and demo concepts remain numerous. Production seed mutation is now hard-disabled with a 404, but the broad surface requires continued route governance.

### MEDIUM

1. `/api/admin/access` has no distributed route-local rate limit and uses ordinary string comparison for the access code. It remains behind verified Supabase identity and an email allowlist.
2. Rate-limit maps are process-local and therefore not globally effective across serverless instances.
3. CSP allows script `'unsafe-inline'` and `'unsafe-eval'`.
4. The admin verification cookie is secure, HTTP-only, strict SameSite, and time bounded, but represents a boolean step-up state rather than a server-side signed challenge receipt.
5. Live deployed-security tests were skipped because no approved staging URL, bearer context, or explicit opt-in was supplied.

### LOW / INFORMATIONAL

- No `dangerouslySetInnerHTML` usage found.
- No high-confidence committed secrets found by verifiers.
- Service-role clients are server-only and use centralized environment validation.
- Webhook HMAC comparison uses timing-safe equality, timestamp tolerance, and raw-body verification.
- Consent and trust-architecture mutations validate content type, body size, origin, and cross-site fetch context.
- Security headers include HSTS, frame denial, MIME sniffing denial, referrer policy, and permissions policy.

## Control review

| Control | Assessment |
|---|---|
| Authentication/session | Functional, Supabase-backed; live E2E not executed |
| Authorization/RBAC | Functional but partial; admin and enterprise roles exist |
| Tenant isolation | Static RLS/source tests pass; live two-tenant proof missing |
| Administrative access | Allowlist + verified email + step-up cookie; rate-limit improvement required |
| Service role | Centralized server-only clients; production execution not audited live |
| API auth/authz | Broad protected helpers and middleware; 183-route surface remains review-heavy |
| CSRF/origin | Implemented for consent, consensus, architecture and selected mutations; not uniformly centralized |
| Rate limiting | Present on sensitive public routes but process-local |
| Replay protection | Provider nonce/event ledger and idempotency contracts present |
| Validation | Correlation IDs, UUID/reference validation, content limits, normalized contracts |
| Output/error safety | Most routes return safe generic errors; safe hardening removed PII email logs |
| Cookies | Secure admin and consent attributes; signed consent cookie |
| CSP/headers | Present; script policy broader than ideal |
| Redirects | Login destination rejects external and protocol-relative redirects; canonical host redirect passes |
| SSRF | No confirmed exploitable source path; framework advisory was patched from 15.5.20 to 15.5.21 |
| Uploads | Private evidence bucket and file validation foundations; live malware/forensics execution unproved |
| Secrets | Named environment access; no values recorded |
| Webhooks | Stripe and provider verification/ledger controls present |
| Audit logging | Broad audit/Trust Event coverage; live persistence unproved |
| Personal-data logging | Admin allowlist email logging removed in this pass |
| Demo/seed | Production seed route now returns 404 unconditionally |
| Health/readiness | Health 200; readiness 503 and blocks release |

## Safe fixes applied

- Updated Next.js and `eslint-config-next` to 15.5.21 to remove the Next.js framework advisories.
- Applied the non-breaking npm audit remediation for the development `brace-expansion` advisory.
- Added a production-first 404 guard to `/api/demo/seed`, with regression coverage.
- Removed normalized email addresses from admin allowlist failure logs.
- Removed six lint warnings without weakening lint or TypeScript rules.

## Security recommendation

Do not deploy RC1. Resolve or explicitly eliminate the `sharp` advisory through a compatible supported dependency path, make Vercel Node 22 consistent, prove live RLS and provider boundaries, and restore `/api/ready` to 200.

