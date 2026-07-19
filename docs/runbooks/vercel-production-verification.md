# Vercel Production verification

## Current result

`REQUIRES VERCEL DASHBOARD VERIFICATION`

Repository and API/CLI evidence verifies the linked project, Production Branch and deployed alignment SHA. Environment completeness, Preview deployment protection and notification settings still require Vercel dashboard evidence.

## Evidence captured on 2026-07-18

| Check | Result | Evidence / required action |
| --- | --- | --- |
| Correct Cyber Sentinels project selected | Verified | Linked project `cyber-sentinels-v2`, project ID `prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr`, owner `Keith Speres' projects` |
| Settings -> Git -> Production Branch = `main` | Verified in Vercel API | Project Git link reported `productionBranch: main` and repository `Cyber-Sentinels-V2` |
| `www.cybersentinels.com` assigned to Production | Verified | `vercel inspect https://www.cybersentinels.com` resolved deployment `dpl_9mqUFURpjiUpbSi7WCmz23nz39PE`, target `production`, status `Ready` |
| Apex redirects to canonical `www` | Verified live | `http://cybersentinels.com` redirects to HTTPS; `https://cybersentinels.com` returns 308 to `https://www.cybersentinels.com/` |
| Production environment variables complete | Requires dashboard verification | `vercel env ls production` returned no named rows in this session; do not infer completeness or absence from that output |
| Preview-only values are not required by Production | Requires dashboard verification | Compare each Production variable with Preview and Development scopes |
| Deployment Protection enabled for Preview where available | Requires dashboard verification | Verify project Security / Deployment Protection settings |
| Preview URLs are not indexed or official | Partially verified | Canonical domain is the public URL; protected routes set `X-Robots-Tag: noindex`. Inspect Preview protection and robots behavior separately |
| Alignment Production contains expected commit SHA | Verified | Deployment `dpl_9gvF9qNmCRRqGHgoL7ueSLx4RtT1` build log records Branch `main`, Commit `b3fa291`; status `Ready` |
| No immediate auth, database or runtime failures | Partially verified | Initial builds emitted non-fatal telemetry writes during static page collection. Deployment `dpl_9xrwQQs2tXzPEEa4KeVou9Rokqgu` built the guarded implementation with zero matching failures, and its bounded post-smoke Production error-log query returned no logs |

## Dashboard procedure

1. Open the linked `cyber-sentinels-v2` project.
2. Confirm Settings -> Git -> Production Branch is `main`.
3. Confirm Domains assigns `www.cybersentinels.com` to the current Production deployment and redirects the apex to `www`.
4. Review Production environment variable names and scopes against `lib/env.ts`, `lib/integrations/registry.ts`, provider configs and `.env.example` if present. Never copy values into this document.
5. Confirm Preview-only variables are not runtime prerequisites for Production.
6. Enable Deployment Protection for Preview deployments where the plan supports it.
7. Confirm Preview URLs are not used in public links, OAuth callbacks, search indexing or customer documentation.
8. Open the latest Production deployment and compare its Git commit with `git rev-parse HEAD`.
9. Inspect build and runtime logs for auth, Supabase, provider, environment or redirect failures.
10. Record reviewer, UTC time, deployment ID and commit SHA below.

## Verification record

| Reviewer | UTC time | Deployment ID | Expected commit | Observed commit | Result |
| --- | --- | --- | --- | --- | --- |
| Codex repository/API audit | 2026-07-19 06:56 UTC | `dpl_9gvF9qNmCRRqGHgoL7ueSLx4RtT1` | `b3fa291` | `b3fa291` | Production commit verified; dashboard-only checks remain |
