# Supabase Credential Incident - Redacted Secret-Scan Evidence

> Scan date: 2026-07-30. Scanner: Gitleaks 8.30.1 with 100% redaction.

No scan searched for, printed, hashed, reconstructed, or tested the exposed
credential.

## Repository evidence

| Scope | Result |
|---|---|
| Git-tracked and proposed files | PASS - 1,969 files, zero findings |
| Staged changes | PASS - zero staged files, zero findings |
| Reachable local and fetched remote refs | PASS - 551 commits, zero findings |
| Reflog-inclusive history | PASS - 555 commits, zero findings |
| Working-tree source false-positive review | PASS - public reconciliation ledger identifiers only |

The Gitleaks configuration narrowly allowlists lines assigning public,
date-prefixed reconciliation phase identifiers. It does not allowlist files,
credential formats, or arbitrary high-entropy strings.

## External safety artifacts

| Artifact | Result |
|---|---|
| Working-tree patch | PASS - zero findings |
| Staged-change marker/patch | PASS - zero findings |
| Working-tree file inventory | PASS - zero findings |
| Repository bundle | PASS - 548 commits, zero findings |
| Untracked-content archive | PASS - zero findings |

The backup scans used isolated copies under the operating-system temporary
directory. Those scan copies and redacted reports contain no detected secret
but remain cleanup items after credential rotation.

## Ignored local state

A broad redacted filesystem scan found 38 candidates:

- 22 in `.next` build/cache output;
- 12 in ignored `.vercel` environment artifacts;
- one in ignored `.env.local`;
- three public reconciliation identifiers later verified as false positives.

No values were displayed. `.env.local` and `.vercel` are expected local secret
locations and are excluded from Git. They must not be opened, copied, or
removed through Codex before the authorized owner completes credential
rotation. Their status is:

```text
PRESENT - REMOVAL REQUIRES HUMAN ACTION
```

## Instruction inventory

Before containment controls were added, the repository contained no executable
instruction for the unsafe schema dry-run, authenticated debug output, or
password argument. One operations report documents the Supabase access-token
variable name without a value; this is legitimate variable-name
documentation.

Current occurrences of unsafe option names are limited to:

- the sanitized incident record;
- the prohibition policy;
- the non-executing guard;
- synthetic redaction tests.

## Limits

Codex session/tool-call storage, terminal application logs, PowerShell history,
screenshots, Supabase database logs, and Supabase management activity have not
been cleared or reviewed. Those gates require human action after rotation.
