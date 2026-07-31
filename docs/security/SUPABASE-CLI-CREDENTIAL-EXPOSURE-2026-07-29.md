# Supabase CLI Credential Exposure - 2026-07-29

> **SECURITY HOLD**

## Sanitized incident record

| Field | Safe value |
|---|---|
| Incident timestamp | 2026-07-29; exact time is not available in safe captured metadata |
| Machine | `LAPTOP-OS3BBLA5` |
| Repository | `C:\Users\emeae\Desktop\cyber-sentinels-clean` |
| Branch | `hotfix/request-demo-turnstile-production` |
| Commit | `676e99642674ddcad3e6578379f43d4e01a1bd73` |
| Supabase CLI | `2.110.0` |
| Sanitized command | `supabase db dump --dry-run [REDACTED]` |
| Output captured | Yes, by the Codex tool-call session |
| Production database password reset | YES |
| Replacement password value recorded | NO |
| Replacement password value requested | NO |
| Replacement password value displayed | NO |
| Password displayed in repository | NO |
| Replacement access token committed | NO |
| Production migration occurred | NO |
| Production schema mutation occurred | NO |
| Production deployment occurred | NO |

The command generated and displayed database connection material even though
the purpose was a read-only execution preview. The value is not reproduced,
partially reproduced, hashed, tested, or intentionally preserved here.

## Context-only classification

The output context identified a generated database login role and password.
The most likely classification is **generated database credential**, possibly
short-lived. Its lifetime and revocation behavior have not been independently
verified, so containment classification is:

```text
UNKNOWN - TREAT AS REUSABLE
```

It was not a value intentionally supplied as an application environment
variable. This conclusion is based only on CLI context, not visual inspection
or authentication testing.

## Possible storage locations

| Location | Status |
|---|---|
| Codex tool-call/session output | PRESENT - REMOVAL REQUIRES HUMAN ACTION |
| Repository working tree and Git objects | Pending redacted scanner verification |
| PowerShell command history | Command text may be present; output storage pending post-rotation review |
| PowerShell transcripts | Unknown; pending post-rotation review |
| Editor/terminal diagnostic logs | Unknown; pending post-rotation review |
| CI artifacts or screenshots | Unknown; human review required |
| External safety patches/bundle/archive | Created before the incident; scanner verification pending |
| Failed schema-capture target outside repository | Metadata review pending post-rotation cleanup |

The original secret-bearing output must not be copied into an incident report,
ticket, email, chat, screenshot, Git artifact, or terminal transcript.

## Required human containment

The authorized Supabase account owner must:

1. reset the Production database password;
2. revoke the personal access token used by the CLI;
3. create a replacement least-privilege scoped token;
4. review and temporarily disable Database Temporary Access unless explicitly
   approved;
5. review temporary-access users and PostgreSQL roles;
6. review database and management activity from the incident time;
7. confirm no unfamiliar connection, token, role, or configuration activity.

Do not provide replacement values to Codex. Confirm only yes/no status and
completion timestamps.

```text
HUMAN SECURITY ACTION REQUIRED - ROTATE SUPABASE CREDENTIALS
```
