# P0 website Production release ? 3 November 2026

This supersedes HANDOFF.md's earlier source-identity, legal-content, conversion and reliability gates. The final verdict and exact release SHA are recorded after verification in P0-SUMMARY.json and the sibling tmp/website-release-20261103.json. The original 0b2ab905ceaa916fe4263c95d0d0f007ae99a9c6 candidate is preserved as this branch's parent; changes here close its demonstrated release gates.

## Production equivalence: closed with source-file evidence

Current Production remains dpl_AFsCyKcsWaKBjAdS32F3Uyqp2FUM, READY, existing project cyber-sentinels-v2 / prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr, team keith-speres-projects / team_cA31fBlNke4vlmtQKM44oWlw. Fresh deployment inspection confirms its public aliases and existing rollback target. Its CLI metadata still has no Git SHA; this is not misrepresented as recovered metadata.

Vercel's complete CLI/API source tree contains 2,882 uploaded source files. EVERY file UID matches the raw SHA-1 of its counterpart in commit 9950dd34e3a17645d853346dcc28dc4526fb70a3 (LF or CRLF bytes). No missing or mismatching file. This establishes a reliable complete uploaded-source equivalence baseline without guessing the deployment commit. See source-identity.json and production-source-manifest.json. Build evidence independently reports Next 15.5.25 and the same older dependency set.

The final diff against that source-equivalent baseline has no app/api handlers, lib or src/lib service/Auth/policy code, middleware, or database migrations changed. No new provider credentials, variables, hosted Auth settings, schema, DNS or infrastructure are required. Three new shared presentation components came from the original website candidate. Existing main's reviewed dependency security fixes (Next 15.5.25 to 15.5.28, patched transitive packages), npm-ci install configuration, CI audit and non-runtime GTM/docs are explicitly included; they are not hidden as website CSS changes. The clean candidate lockfile install, dependency graph and production advisory audit are verified separately. No operational trust enforcement branch or PR128 migration is included.

## Legal publication gate: unapproved wording withheld

The original shared draft template published unapproved jurisdiction, liability, policy, statutory-statement and contact-routing language. legal-review-inventory.json records exact statement bodies, paths and original Git source objects for review. Those subtitle/section statements now remain in source for review and are NOT rendered to visitors. Shared draft pages display only a neutral review/publication notice and functional contact/privacy-control links. Privacy policy assertions and draft How-to-Use guidance are similarly withheld; Data Rights remains an authenticated route: existing middleware returns 503 in the unconfigured local environment, with no draft exposed; its existing request action remains guarded. Page-level publication guards do not weaken that middleware. Unapproved pages with local metadata are noindex. No legal obligations, governing law, warranty, compliance certification or counsel approval were invented. This qualifies absence of unapproved wording, not legal adequacy of a future policy. Publishing substantive policy text remains a separate content-owner/legal approval.

## Conversion gate: routes and approved fallback verified, no delivery claim

/contact now redirects to /enterprise-access?intent=intro_call. Demo Request and Pilot keep their existing enquiry forms, required fields, CAPTCHA, rate limiting and unchanged backend. Investor links lead to the existing funding brief; its mailto and the visible form fallback use emeaexecutive@icloud.com. The founder explicitly approved that mailbox for public display in this conversation. info@cybersentinels.com is a future preference only; it was not provisioned or substituted. public-mailbox-approval.json records this decision.

Mailto opens the visitor's mail application; no message was sent and no successful delivery is claimed. No real form submission was made. Hosted Supabase and Turnstile variable names/scopes are present; no values were decrypted, printed or changed. Form GETs and approved contact destinations are verified. Actual receipt of a future enquiry is a post-deployment operational observation, not fabricated test evidence. Any deliberate live test message requires explicit approval.

## Reliability gate: current critical public journeys qualified

Initial read-only GETs returned 200 for home, pricing, platform, Help, demo/pilot forms, funding, investor, login, favicon and health. /contact returned a demonstrated 404 and is fixed in this candidate. A second targeted set of nine pages and eight static assets returned 200 with the identified release client. Default Python-user-agent requests received 403, while the identified client returned 200; record this as automated-client rejection, not an application 500 or authentication bypass.

Vercel's runtime error group identifies anonymous Help's missing-email admin-allowlist log. Source inspection shows the function logs and returns false; it does not prove an HTTP 500. Help now checks for a user email before invoking that check. Anonymous access remains non-admin, form submission still requires Auth, and configured infrastructure errors are not converted to fabricated success. Hosted Help GETs returned 200. Historical unexplained 500s remain OPEN as a separate operational investigation; none reproduced on the checked critical website paths. Staged and post-promotion monitoring remain mandatory.

## Bounded verification

Reuse original 85 focused tests, 16 browser interactions at four widths and five route smokes. Do not recount prior checks as newly run. Additional changes receive seven targeted rendering/contact/Help tests, eight clean-install dependency tests, production npm audit, final native production build (including lint/type checks), and targeted production-mode browser checks. Exact current results are in P0-SUMMARY.json and P0-VERIFICATION.md. An earlier dependency command was invoked outside npm and failed its harness precondition; it was corrected without changing the test. Founder-installed packages were found not identical to this lockfile, so npm ci --ignore-scripts installed an independent candidate graph before final verification. No founder files were changed.

## GitHub and deployment preparation

Target branch: release/website-only-20261103. Base: live remote main 63a0e0f550f65b4beb3c52afabdba0481b510e69; exact release SHA is in the sibling release record. Candidate remains local: no push or merge, and no CI result is claimed for an unpushed SHA. A future PR into protected main must pass analyze (javascript-typescript), docker-build, gitleaks, verify and CodeQL. Existing workflow runs npm ci, production audit, lint, typecheck, security/environment tests, npm test, Auth browser tests and build. Push/merge would require separate founder authorization; this controlled CLI release does not change main or its protections. Existing vercel.json disables automatic main deployment.

Local .vercel/project.json is prepared with ONLY existing project/team IDs. No hosted setting was changed and no secrets were pulled. After founder approves the exact SHA and release operations:

1. Verify clean checkout at the approved SHA; compare manifest/source hashes and confirm the existing rollback deployment remains READY. Prepare a clean source export using git archive of that exact SHA, so ignored local HTML probes, logs, installed modules, caches and any local environment files cannot enter the upload. Copy ONLY the existing project/team IDs into the export's .vercel/project.json; no secrets. Use approved Node 22 / npm 10. Existing vercel.json specifies npm ci for the remote build. The prepared archive SHA-256 is recorded in the sibling release record.
2. From that checkout, stage a Production-target deployment WITHOUT assigning domains:
   vercel deploy --prod --skip-domain --scope keith-speres-projects --meta releaseSha=<APPROVED_SHA> --meta sourceBaselineSha=9950dd34e3a17645d853346dcc28dc4526fb70a3
   This remote build uses the existing project's Production environment; it does not provision a project, rotate secrets or pull their values locally. Record the new deployment ID, build status, metadata and outputs. No prebuilt environment mismatch is introduced.
3. Verify the staged Production deployment through the authorized account: contact redirect, demo/pilot forms and approved mailto, investor brief, Help, legal notices, privacy controls, login/Auth-unavailable boundaries as applicable, pricing layout/Translate/mobile behavior and static assets. Inspect new runtime logs. Do not send a message or submit a live form without explicit approval. Do not promote a preview build or a failed/unknown build.
4. If staged checks pass, promote THAT production deployment ID:
   vercel promote <STAGED_PRODUCTION_DEPLOYMENT_ID> --scope keith-speres-projects
   This is the separately described promotion operation included only if founder approves the controlled release.
5. Verify cybersentinels.com canonical redirect and www.cybersentinels.com. Control-plane aliases must identify the new deployment ID; its releaseSha metadata must equal the approved SHA. Independently check public DOM fingerprints: four pricing cards/white aligned CTAs, Translate immediately after Sign In, honest language notice, /contact redirect, and withheld-policy notice. Check returned static asset URLs against the staged build. Record actual Production ID and smoke/runtime-log results. No public release marker or invented hosted result is added now.

## Exact rollback

vercel rollback dpl_AFsCyKcsWaKBjAdS32F3Uyqp2FUM --scope keith-speres-projects

Verify both public hostnames, alias target, login and critical public pages; record actual state. Rollback disables automatic assignment for subsequent deployments; restore only with an approved promote of a verified production deployment. No database rollback is needed because this release has no migration. The former deployment's older dependency vulnerabilities remain a known rollback trade-off, not a claim that rollback fixes the platform.

## Founder approval scope

Approve the final exact release SHA and manifest, publication of neutral review notices instead of unapproved policy wording, use of the already confirmed public mailbox, and the existing project's staged Production deployment, smoke checks, promotion and rollback if needed. No authorization to push, merge, migrate, alter hosted Auth/secrets, change DNS, provision investor hosting or spend on additional infrastructure is inferred. Platform and investor hosting remain outside this website release.
