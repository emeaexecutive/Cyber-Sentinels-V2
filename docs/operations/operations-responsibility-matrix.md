# Engineering Operations Responsibility Matrix

**Status:** Role-based specification; named assignments and on-call schedules are external

| Activity | Accountable | Responsible | Required consultation | Evidence |
| --- | --- | --- | --- | --- |
| Production deployment | Release owner | Operations/Engineering | Security, Data, Product | Release and smoke record |
| Release approval | Release owner | Domain owners | Security, Quality, Data, Operations | Go/no-go decision |
| Migration approval | Data owner | Database engineer | Application, Security, Operations | Migration record and tests |
| Incident command | Incident Commander | Technical leads | Security, Communications, affected owners | Incident record |
| Security escalation | Security owner | Security responder | Incident Commander, Data, Legal/Privacy | Security timeline/actions |
| Provider escalation | Provider owner | Integration engineer | Operations, Security, vendor contact | Provider incident/evidence |
| Cloudflare/domain | Operations owner | Authorized platform operator | Security, Communications | Config/recovery evidence |
| Vercel | Operations/Release owner | Authorized platform operator | Engineering, Security | Deployment/log evidence |
| Supabase | Data owner | Authorized database operator | Security, Engineering | Migration/backup/RLS evidence |
| Customer communication | Communications/Product owner | Assigned communicator | Incident Commander, Security/Legal | Approved messages/timestamps |
| Recovery validation | Incident/Release owner | Quality + domain owners | Security, Data, Operations | Verification checklist |
| Documentation publication | Engineering owner | Document author | Security, domain owners | Reviewed commit |

## Separation and escalation

No individual approves their own high-risk migration, security exception and Production deployment without an emergency record. Missing accountable coverage is a `NO-GO`. External contacts, schedules and personal details belong in an access-controlled operator directory, not this public repository.

## Review

Review assignments quarterly and after organizational/platform changes or incidents. Role labels in documents do not prove a staffed on-call function.
