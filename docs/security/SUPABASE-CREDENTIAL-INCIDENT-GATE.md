# Supabase Credential Incident Gate

> **SECURITY HOLD - RELEASE WORK MUST NOT RESUME**

- [x] Database password reset
- [ ] CLI personal access token revoked
- [ ] Replacement scoped token created
- [ ] Temporary Access status reviewed
- [ ] Temporary Access disabled or explicitly approved
- [ ] Local CLI credentials cleared
- [ ] Shell history reviewed
- [ ] Terminal transcripts reviewed
- [ ] Diagnostic artifacts reviewed
- [x] Repository scanned
- [x] Repository bundle scanned
- [x] Patch backups scanned
- [x] Remote Git history checked
- [ ] Database access logs reviewed
- [ ] Management activity reviewed
- [ ] No suspicious activity found or investigation completed
- [x] Unsafe dry-run instructions removed
- [x] Safe CLI execution policy added
- [x] Secret scanning enabled locally and CI workflow prepared
- [x] Safe command guard tested
- [ ] Incident owner signs closure

## Human confirmation record

Do not record credentials. Record only yes/no status, timestamp, and incident
owner approval.

| Action | Status | Completion timestamp | Owner |
|---|---|---|---|
| Database password reset | YES | NOT PROVIDED | NOT RECORDED |
| CLI token revoked | REQUIRED |  |  |
| Replacement scoped token created | REQUIRED |  |  |
| Temporary Access reviewed | REQUIRED |  |  |
| Database access logs reviewed | REQUIRED |  |  |
| Management activity reviewed | REQUIRED |  |  |
| Incident closure | REQUIRED |  |  |

Current classification:

```text
BLOCKED - INCIDENT CLOSURE ACTIONS REQUIRED
```

## Post-recovery database connection review

Only variable names were reviewed; no value was displayed, copied, compared,
or tested.

| Location | Result |
|---|---|
| Repository `.env.example` | No direct database connection variable |
| Ignored local `.env.local` | No direct database connection variable |
| Ignored local Vercel Preview snapshot | No direct database connection variable |
| Ignored local Vercel Production snapshots | `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, and `POSTGRES_URL_NON_POOLING` names present; values not inspected |
| Live Vercel project | UNKNOWN - no authenticated read-only interface was available |
| GitHub Actions repository secrets | No names configured |
| GitHub Actions repository variables | No names configured |
| Tracked database tooling and CI | No direct connection value; guard contains prohibited variable names only |

Whether the three live Vercel connection values were refreshed after the
Production database password reset requires human review in Vercel. The old
password must not be tested or supplied to Codex.
