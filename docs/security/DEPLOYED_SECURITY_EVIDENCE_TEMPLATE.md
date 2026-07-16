# Deployed security evidence template

```json
{
  "environment": "https://approved-staging.example",
  "buildVersion": "commit-sha",
  "timestamp": "ISO-8601",
  "testName": "rls_read_denial",
  "result": "passed|failed|blocked",
  "sanitizedEvidenceReference": "artifact-or-audit-reference",
  "limitation": "No secret, token or raw payload",
  "operator": "named-role"
}
```

Credential contents, session tokens, signatures and personal data are prohibited.
