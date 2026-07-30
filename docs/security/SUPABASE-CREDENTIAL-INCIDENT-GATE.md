# Supabase Credential Incident Gate

> **SECURITY HOLD - RELEASE WORK MUST NOT RESUME**

- [ ] Database password reset
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
| Database password reset | REQUIRED |  |  |
| CLI token revoked | REQUIRED |  |  |
| Replacement scoped token created | REQUIRED |  |  |
| Temporary Access reviewed | REQUIRED |  |  |
| Database access logs reviewed | REQUIRED |  |  |
| Management activity reviewed | REQUIRED |  |  |
| Incident closure | REQUIRED |  |  |

Current classification:

```text
BLOCKED - CREDENTIAL ROTATION REQUIRED
```
