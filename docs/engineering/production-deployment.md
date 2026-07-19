# Production Deployment

**Status:** Approved procedure; Vercel and Cloudflare settings require external verification

## Canonical path

- Source branch: `main`
- Deployment environment: Vercel Production
- Canonical domain: `https://www.cybersentinels.com`
- Preview deployments are non-canonical and must not receive Production secrets or indexing.

## Preconditions

1. Approved release scope and go/no-go record.
2. Expected commit SHA on `main` and no unrelated files staged.
3. Required CI/quality, migration and security checks passed.
4. Production environment names/scopes verified without reading values into logs.
5. Database migration plan, compatibility window and rollback/forward-fix owner approved.
6. Application and database rollback runbooks available.

## Deployment sequence

1. Confirm Vercel Production Branch is `main` and domain aliases target Production.
2. Apply approved backward-compatible database migrations before code only when the change requires it.
3. Push the reviewed commit to `main`; Git integration is the preferred deployment trigger.
4. Do not run an unqualified `vercel` command. If Git integration is unavailable and a direct deployment is explicitly approved, use `vercel --prod`.
5. Confirm the Vercel build references the expected SHA and reaches `Ready`.
6. Confirm canonical aliases and Cloudflare behavior.
7. Execute `docs/testing/production-smoke-tests.md`.
8. Record deployment ID, SHA, operator, time, migrations, smoke evidence and known gaps.

## Failure handling

Stop on the wrong SHA, failed migration, missing environment, authentication/tenant boundary failure, elevated errors or missing critical evidence. Prefer `git revert <bad-commit-sha>` followed by a normal Production deployment. A Vercel rollback does not revert Supabase schema.

## Evidence boundary

`docs/releases/production-alignment-verification.md` records earlier successful checks. It is historical evidence, not proof that current external configuration remains unchanged.
