# Supabase CLI Safe Execution Policy

> Effective immediately. Security owner approval is required to relax any
> control.

## Prohibited captured execution

- `supabase db dump --dry-run`
- authenticated Supabase commands with `--debug`
- commands containing `--password` or the password short option
- commands containing a credential-bearing `--db-url`
- commands that print Supabase access-token or database-password variables
- commands that display database connection strings
- commands that place a password or token in visible arguments
- Production mutations without a separately recorded authorization

Do not use PowerShell transcription, shell debug/echo modes, verbose process
inspection, or AI-visible command capture during secret operations.

## Required safe practices

1. Use native credential storage or an approved secret manager.
2. Authenticate through non-echoing prompts outside captured execution.
3. Use least-privilege, scoped, environment-specific tokens.
4. Keep Production and staging identities exact and separate.
5. Run secret-bearing commands manually outside AI-visible capture.
6. Redirect only output that is known in advance to be secret-free.
7. Store schema output in a protected temporary path and scan it before moving
   it into the repository.
8. Sanitize status and error logs before retention.
9. Disable PowerShell transcription for secret operations and securely remove
   temporary transcripts afterward.
10. Rotate credentials after any suspected disclosure.

## Safe schema-baseline procedure

1. Install and start Docker Desktop.
2. Verify Docker with a non-secret local command.
3. Authenticate the Supabase CLI manually outside captured execution.
4. Run the actual schema-only dump directly to a protected temporary file.
   The dump command itself must not run through Codex-visible capture.
5. Record only a sanitized success/failure status.
6. Scan the SQL file with a redacting secret scanner.
7. Normalize the schema deterministically.
8. Commit only the sanitized schema baseline and its safe fingerprint.
9. Delete temporary command logs and other sensitive artifacts.

`--dry-run` is not part of this procedure. Codex may inspect a resulting schema
file only after the redacted scanner reports no secret.

## Enforcement

Use `scripts/assert-safe-supabase-command.ps1` before any Supabase command.
The wrapper validates arguments only; it does not execute them and never uses
`Invoke-Expression`.
