# Screenshot Support and Debugging

## Operational diagnostics philosophy

Cyber Sentinels support diagnostics are purpose-bound records for resolving visible product and workflow problems. They are not behavioral monitoring, trust evidence or a source of automated conclusions.

The support flow is available only after authentication. Screenshot review and issue-state management remain restricted to verified administrators.

## Debugging workflow

1. An authenticated user selects **Report Issue**.
2. The user describes the problem and may add workflow, provider, replay and trust-posture context.
3. The interface shows exactly which diagnostic fields will be included.
4. The user explicitly consents and may attach a screenshot.
5. The report enters the protected support queue.
6. An administrator reviews the screenshot and diagnostics, inspects replay when referenced, records triage notes and tracks fix verification.

Supported regression categories include broken dropdowns, missing buttons, authentication rendering failures, replay rendering problems, typography/layout regressions and general workflow diagnostics.

## Screenshot handling

Screenshots are optional. The application never captures the screen automatically.

Accepted formats are PNG, JPEG and WebP, up to 5MB. Files are stored in the private `support-screenshots` bucket. They are uploaded server-side after authentication and retrieved for a verified administrator through a short-lived signed URL.

“Screenshots help improve workflow continuity and operational reliability.”

## Diagnostic payload

The allowlisted payload may include:

- current route
- user-supplied workflow ID and workflow state
- user-supplied replay reference
- user-supplied provider and trust-posture states
- authenticated access state
- a session-scoped random support reference
- browser user agent, language and online state
- viewport and screen dimensions
- timezone
- deployment build version
- report timestamp

The payload does not include passwords, cookies, access tokens, refresh tokens, authorization headers or hidden screen content.

## Privacy boundaries

- No public support-report access.
- No hidden screenshot capture.
- No automatic trust-data extraction.
- No background behavioral tracking.
- No credentials or secret tokens.
- No weakening of authentication, admin verification or RLS.
- Users can read only their own issue records through RLS.
- Administrative review uses the existing allowlist and verified admin cookie.

Users should avoid attaching unrelated personal information. Screenshots and diagnostics should follow the organization’s support retention and deletion policy.

## Support review process

The protected routes `/admin/support` and `/admin/support/[id]` provide:

- chronological issue queue
- optional screenshot review
- workflow and session diagnostics
- replay inspection link
- issue states from `new` through `closed`
- administrator notes
- fix-verification notes and reviewer attribution

Support records remain operational debugging artifacts. They do not alter workflow trust, governance outcomes or verification receipts.
