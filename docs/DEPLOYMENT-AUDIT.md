# Cyber Sentinels V2 Deployment Audit

**Audit date:** 2026-07-24  
**Repository:** `emeaexecutive/Cyber-Sentinels-V2`  
**Audited branch:** `epic-25-enterprise-trust-centre` at `a0327cd`  
**Audit mode:** Read-only. No GitHub, Vercel, Supabase, DNS, branch, environment, or deployment configuration was changed.

## Executive conclusion

Production deployment is not universally broken. Vercel can build and deploy the application, and the public site is currently reachable. The apparent "Preview succeeds but Production does not deploy" condition is caused by several independent issues:

1. **Normal production auto-deployment has no new release commit to consume.** GitHub and the Vercel deployment history indicate that `main` is the automatic production path. `main` remains at EPIC 19 (`3de8a66`); EPIC 20-25 are unmerged feature branches or draft pull requests.
2. **The live production alias is not serving `main`.** `www.cybersentinels.com` reports runtime commit `63aa03d`, the EPIC 23 commit. GitHub records show that commit was promoted to the Vercel `Production` environment. Production has therefore drifted from the GitHub default branch.
3. **The deployed application is not ready.** The public readiness endpoint returns HTTP `503` with `ENTERPRISE_TRUST_DOMAIN_REGISTRY_INCOMPLETE`. Required baseline environment variables are present, but the production data plane does not contain the expected active set of ten enterprise trust domains. The endpoint also reports external controls as blocked.
4. **Supabase schema delivery is unreliable.** Recent `Supabase Preview` checks are failing or cancelled. The production database can be queried, but its canonical trust-domain seed state is incomplete.
5. **EPIC 24 has a separate Vercel failure.** Its Vercel check redirects to Vercel Cron Jobs usage/pricing documentation. This is consistent with the configured `*/5 * * * *` schedule being rejected by the current project plan or cron entitlement. EPIC 24 also requires a `CRON_SECRET` that is not present in the inspected production environment snapshot.

The application is therefore **deployed but not production-ready**, while the intended release branches have not reached the automatic production branch.

## Evidence and scope

The audit inspected:

- Local and remote Git refs and ancestry.
- GitHub repository metadata, pull requests, checks, Actions runs, deployments, environments, rulesets, and branch protection.
- Repository build, runtime, Vercel, and environment contracts.
- Local Vercel project linkage and the production environment snapshot, checking variable names only.
- Public production HTTP behavior and readiness metadata.
- GitHub-recorded Vercel and Supabase deployment checks.

Direct Vercel control-plane inspection was limited: the available local Vercel OIDC token returned HTTP `403` for project API access. Detailed Vercel project settings, scoped environment values, and raw Vercel build logs could not be independently read. The production-branch conclusion is therefore based on observable deployment behavior rather than a direct `productionBranch` API response.

No environment-variable values or secrets are included in this report.

## Current configuration

### 1. Git branches

The local branch was clean at the start of the audit and tracked its corresponding remote.

| Branch | Head | Relationship to `main` | Release state |
|---|---:|---:|---|
| `main` | `3de8a66` | Baseline | GitHub default branch; latest merged work is EPIC 19 |
| `epic-20-trust-intelligence-engine` | `35ad7b9` | 3 commits ahead | No pull request found |
| `epic-21-enterprise-trust-graph` | `4f81790` | 4 commits ahead | No pull request found |
| `epic-22-trust-dna` | `ce1f309` | 5 commits ahead | Draft PR #6 targets EPIC 21 |
| `epic-23-replay-engine` | `63aa03d` | 6 commits ahead | Draft PR #7 targets EPIC 22 |
| `epic-24-continuous-trust-engine` | `b02e45c` | 1 commit ahead | Draft PR #8 targets `main` |
| `epic-25-enterprise-trust-centre` | `a0327cd` | 1 commit ahead | Draft PR #9 targets `main` |

EPIC 20-23 form a stacked chain. EPIC 24 and EPIC 25 are independent branches from `main`. Because EPIC 20 and EPIC 21 have no discovered pull requests, the stacked EPIC 22 and EPIC 23 pull requests do not currently provide a complete path to `main`.

### 2. GitHub default branch

- Default branch: `main`.
- Repository visibility: public.
- Audit user permission: admin.
- Latest audited `main` push at `3de8a66` passed the GitHub verification workflow and received a successful Vercel Production deployment.

### 3. Vercel production branch

- Observable deployment behavior is consistent with `main` being the automatic production branch.
- The exact Vercel `productionBranch` field could not be read because the Vercel API rejected the available credential with HTTP `403`.
- GitHub nevertheless records successful Vercel Production deployments for:
  - `main` commit `3de8a66`.
  - EPIC 23 commit `63aa03d`.
  - An earlier feature commit `8ed3268`.
- The latter feature deployments demonstrate that non-`main` commits can be promoted through a manual or otherwise non-branch production path.

This creates two sources of truth: `main` for normal automatic production and manually promoted feature commits for the live production alias.

### 4. GitHub integration

The Vercel GitHub App integration is active:

- Vercel creates GitHub deployments as `vercel[bot]`.
- Pull requests receive Vercel checks and deployment URLs.
- The latest `main` push received a successful Vercel Production deployment.
- No repository webhook was listed, which is expected for a GitHub App installation and is not evidence of a missing integration.

The Supabase integration is present but unhealthy:

- PR #9: `Supabase Preview` cancelled.
- PR #8: `Supabase Preview` cancelled.
- PR #7: `Supabase Preview` failed.
- PR #6: `Supabase Preview` failed.
- The audited `main` commit also contains a failed Supabase check.
- Earlier pull requests had successful Supabase Preview checks, indicating regression or exhaustion in the external integration rather than a permanently absent integration.

### 5. Build configuration

| Setting | Repository configuration | Observed deployment configuration |
|---|---|---|
| Framework | Next.js | Next.js |
| Install | Vercel project snapshot: `npm install`; GitHub Actions: `npm ci` | Vercel linkage says `npm install` |
| Build | `npm run build` -> `next build` | `npm run build` |
| Output | `.next` | `.next` |
| Root directory | Repository root | Repository root |
| Node | `package.json`: `22.x`; `.nvmrc`: `22`; `.node-version`: `22`; Actions: `22` | Local `.vercel/project.json` snapshot says `24.x`, but the generated deployment manifest resolved and requested `22.x` |

The actual deployment manifest agrees with the repository on Node 22. The `24.x` local project snapshot is configuration drift and should be reconciled, but it is not the cause of the current production failure.

The GitHub production verification workflow runs on:

- Every pull request.
- Pushes to `main` only.

It executes install, lint, typecheck, cookie-consent tests, the full test suite, and the production build.

### 6. Environment variables

The inspected production snapshot contains the baseline variables required by the readiness implementation:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The live readiness response confirms the environment check is `READY`. Missing baseline credentials are therefore not the reason for the current HTTP `503`.

The production snapshot also contains site URL, admin access, Stripe secret, Supabase/Postgres integration, and Vercel system variable names. It does not contain several optional provider, ML, Turnstile, World ID, OpenAI, or Stripe configuration names documented by `.env.example`. These may intentionally represent disabled integrations, but the intended scope for each deployment environment is not documented.

Environment-contract drift was found:

- `.env.example` documents `STRIPE_PRO_PRICE_ID`.
- Runtime billing code expects `STRIPE_PRO_MONTHLY_PRICE_ID`.
- The expected monthly price variable was not found in the inspected production snapshot.
- Server code also references variables such as `CONSENT_COOKIE_SECRET`, `SECURITY_HASH_SECRET`, and, on EPIC 24, `CRON_SECRET`, which are not consistently represented in `.env.example`.

This drift can leave individual features unavailable even when the core Next.js build succeeds.

### 7. Preview versus Production settings

| Path | Trigger | Observed result |
|---|---|---|
| Pull-request Preview | PR update / branch push | Vercel Preview commonly succeeds; URL is protected by Vercel SSO |
| Automatic Production | Push/merge to `main` | Successful for `3de8a66`; no later EPIC commit has reached `main` |
| Manual/non-branch Production | Feature deployment promotion | EPIC 23 `63aa03d` is currently served by the production domain |
| Production readiness | Request to `/api/ready` | HTTP `503`; trust-domain registry incomplete and external controls blocked |
| EPIC 24 Preview | PR #8 deployment | Vercel failure associated with Cron Jobs usage/pricing |

GitHub environments named `Preview` and `Production` exist but have no reviewer gates, wait timers, or branch restrictions. They do not prevent accidental feature-branch promotion.

### 8. Build logs

Available GitHub build evidence is healthy:

- The `main` verification run for `3de8a66` completed successfully.
- Next.js compiled successfully and generated 183 pages.
- The current EPIC 25 pull request verification, including its build, passed.
- The current EPIC 25 Vercel Preview deployment passed.

Vercel raw build logs could not be retrieved with the available credential. However:

- GitHub deployment statuses prove successful Preview and Production completions for the cited commits.
- EPIC 24's Vercel status target redirects to Cron Jobs usage/pricing, identifying a Vercel configuration/entitlement rejection rather than a TypeScript or Next.js compile failure.
- The production domain returning an application-generated readiness response proves a Vercel runtime is active.

### 9. Branch protection

`main` has no classic branch protection, and the repository has no rulesets. GitHub reports no required:

- Pull request review.
- Status checks.
- Conversation resolution.
- Force-push restriction.
- Deletion restriction.
- Signed commits.

GitHub Actions accepts all actions, and SHA pinning is not required. The GitHub `Production` environment also has no protection rules.

This is a high-risk production governance gap.

### 10. Deployment triggers

- `.github/workflows/production-verify.yml` validates all pull requests and pushes to `main`.
- Vercel creates Preview deployments for pull-request branches.
- Vercel creates Production deployments for `main` and permits feature deployments to be promoted to Production.
- Supabase Preview runs as an external pull-request check but is currently failing or cancelling.
- A legacy GitHub Pages deployment workflow remains enabled, with its last observed run in May. If unused, it is a stale alternative deployment mechanism and a source of operational ambiguity.

## Root-cause analysis

### Why Preview appears to succeed

Vercel Preview builds a feature branch directly. It does not require that branch to be merged into `main`, and it does not prove that the production Supabase database contains the branch's migrations or canonical seed data. EPIC 25 therefore passes its application build and receives a Preview URL even though the release chain is incomplete and Supabase Preview is cancelled.

### Why Production does not advance normally

The automatic production path follows `main`, but no EPIC 20-25 commit has been merged into `main`. Several pull requests remain drafts, EPIC 22 and EPIC 23 target intermediate feature branches, and the two base branches needed to connect that stack to `main` have no discovered pull requests. There is no new eligible `main` commit for Vercel to deploy automatically.

### Why the current Production deployment is unhealthy

EPIC 23 was promoted to Production outside the normal `main` release path. The live domain reports commit `63aa03d`, while GitHub `main` remains at `3de8a66`.

The application then evaluates production readiness:

- Environment credentials: ready.
- Repository runtime: verified.
- Enterprise trust architecture: not ready.
- External controls: blocked.

The readiness implementation queries the active `trust_domain_versions` registry and requires exactly ten version `1.0.0` entries. The query succeeds, but the expected canonical set is incomplete. This points to missing or unsynchronized migration/seed state in the production Supabase project, not a failed Vercel application build.

### EPIC 24 exception

EPIC 24 adds a five-minute Vercel cron schedule. Its Vercel failure links to Cron Jobs usage/pricing, consistent with a plan or schedule entitlement constraint. Its failure must be fixed separately from the general release-branch and Supabase readiness issues.

## Problems found

| Priority | Problem | Impact |
|---|---|---|
| Critical | Production alias serves feature commit `63aa03d`, not GitHub default `main` | Production provenance and rollback expectations are unreliable |
| Critical | `/api/ready` returns `503` because the enterprise trust-domain registry is incomplete | Deployment is live but not operationally ready |
| High | EPIC 20-23 release chain is incomplete; EPIC 20/21 have no discovered PRs and later PRs target feature branches | Work cannot reach `main` through the current PR topology |
| High | Recent Supabase Preview checks fail or cancel | Migration and seed validation cannot be trusted before release |
| High | No `main` branch protection or repository ruleset | Code can bypass review and required checks |
| High | GitHub Production environment has no approvals or branch restrictions | Any authorized feature deployment can be promoted to Production without a release gate |
| High | EPIC 24 cron configuration is rejected by the current Vercel plan/configuration | EPIC 24 Preview and eventual production deployment are blocked |
| Medium | Exact Vercel production branch and scoped environment configuration could not be independently verified | Control-plane audit remains partially unverified |
| Medium | Node 22 repository/deployment manifest conflicts with a `24.x` local Vercel project snapshot | Future builds can drift if the override changes precedence |
| Medium | Environment-variable documentation and runtime names differ | Billing, jobs, security signing, or optional providers can silently remain unavailable |
| Medium | Vercel raw logs and Supabase external-check logs were unavailable | External failure details cannot be independently reproduced from this workstation |
| Low | Legacy GitHub Pages workflow remains enabled | Creates deployment ownership ambiguity |
| Low | Actions are unrestricted and SHA pinning is disabled | Supply-chain controls are weaker than an enterprise production baseline |

## Recommended fixes

No fix below was applied during this audit.

1. **Choose and document one release topology.**
   - Either merge EPIC 20 and EPIC 21 into `main`, then advance/retarget the stacked EPIC 22 and EPIC 23 pull requests in order, or rebase and open a deliberately consolidated release PR.
   - Resolve EPIC 24 and EPIC 25 against that chosen baseline before merging.
   - Convert draft pull requests to ready only after their required dependency commits and checks are present.

2. **Re-establish a single production source of truth.**
   - Verify in Vercel that the production branch is `main`.
   - Restrict or procedurally prohibit direct feature-branch promotions.
   - After validation, deploy an approved `main` commit and confirm the production alias reports that same SHA.

3. **Repair Supabase migration and seed delivery.**
   - Inspect the Supabase GitHub integration logs, project linkage, preview branch limits, and migration execution history.
   - Confirm every intended migration is applied to the correct Preview and Production projects through a controlled migration pipeline.
   - Reconcile the canonical enterprise trust-domain seed through its migration, then verify exactly ten active version `1.0.0` domains.
   - Do not manually insert production rows without first establishing why the migration/seed path failed.

4. **Resolve the EPIC 24 scheduler constraint.**
   - Confirm the Vercel plan's cron frequency entitlement.
   - Either use a supported schedule, upgrade the applicable plan, or use an approved external scheduler.
   - Provision `CRON_SECRET` separately for Preview and Production and validate authenticated job invocation.

5. **Add release protection.**
   - Protect `main` with pull requests, at least one approval, resolved conversations, and required GitHub verification, Vercel, and Supabase checks.
   - Block force pushes and branch deletion.
   - Protect the GitHub `Production` environment with required reviewers and a `main`-only deployment branch policy.

6. **Align build runtime settings.**
   - Set Vercel, `package.json`, `.nvmrc`, `.node-version`, and GitHub Actions to the same supported Node 22 release line.
   - Use one documented install strategy; retain `npm ci` where deterministic lockfile installation is required.

7. **Create an explicit environment contract.**
   - Document every variable, its owner, whether it is required or optional, and its Preview/Production scope.
   - Resolve `STRIPE_PRO_PRICE_ID` versus `STRIPE_PRO_MONTHLY_PRICE_ID`.
   - Add the undocumented server secrets to `.env.example` using empty placeholders only.
   - Express intentionally disabled integrations explicitly rather than relying on missing variables where feasible.

8. **Make readiness a deployment gate.**
   - After deployment, verify the public domain, `/api/ready`, runtime commit SHA, database schema/seed version, and critical external controls.
   - Fail or roll back the release if the alias SHA does not match the approved commit or readiness is not HTTP `200`.

9. **Harden GitHub Actions.**
   - Restrict allowed actions to approved sources and pin third-party actions to immutable commit SHAs.
   - Retire or disable the legacy GitHub Pages workflow if it is no longer part of the documented architecture.

10. **Restore audit visibility.**
    - Provide least-privilege read access for Vercel project settings, deployment logs, and environment-variable names/scopes.
    - Preserve Supabase integration logs and migration results as required release evidence.

## Risk assessment

| Risk | Likelihood | Impact | Rating |
|---|---|---|---|
| Unreviewed or wrong-branch production deployment | High | Critical | Critical |
| Production serves a commit different from the approved Git branch | Confirmed | High | Critical |
| Database schema/seed does not match application runtime | Confirmed | Critical | Critical |
| Preview gives false confidence because Supabase validation did not pass | High | High | High |
| EPIC 24 scheduled processing never runs | High | High | High |
| Missing environment variables disable security or commercial features | Medium | High | High |
| Node/project-setting drift causes future deployment variance | Medium | Medium | Medium |
| Supply-chain compromise through unrestricted Actions | Low-Medium | High | Medium |

## Verification required after remediation

The deployment may be considered ready only when all of the following are demonstrated:

- The approved release commit is merged to protected `main`.
- GitHub verification, Vercel, and Supabase checks are successful and required.
- Vercel reports `main` as the production branch.
- The production custom domain reports the approved `main` commit SHA.
- `/api/ready` returns HTTP `200`.
- The production trust-domain registry has the expected canonical ten active version `1.0.0` records.
- External control-plane evidence is no longer `BLOCKED`.
- EPIC 24's scheduler is accepted and an authenticated invocation succeeds.
- Preview and Production environment contracts are documented and verified without exposing secret values.
- Production deployment logs and rollback evidence are retained.

## Final status

**BLOCKED**

Production is reachable and Vercel deployment capability is functioning, but release provenance, production readiness, Supabase migration/seed integrity, EPIC 24 scheduling, and production governance do not meet a safe production baseline.
