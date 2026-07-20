# Consent Security Controls

- Mutation APIs require JSON, bounded bodies, same-origin checks, non-cross-site Fetch Metadata and idempotency keys.
- The consent cookie uses SameSite=Lax, Path=/, Secure in Production and HMAC integrity. The anonymous token is HttpOnly and rotated by expiry.
- Server decisions validate signed state; client state alone is never authority for server forwarding.
- Optional trackers begin denied and can load only through the central registry. Withdrawal runs cleanup and prevents future loads.
- RLS denies anonymous database access, limits authenticated reads to the user's enterprise/subject and grants no browser mutation. Enterprise admin reports are aggregated through controlled APIs.
- Consent receipts, events and audit records reject update/delete. Current preferences remain intentionally materialized and replaceable.
- Unknown trackers are blocked from Essential classification; raw IP columns and raw payload storage are absent.

Escape cannot silently dismiss the first-choice banner. Escape closes the preference dialog back to the banner, with focus returned. Both dialogs trap keyboard focus, expose semantic labels and honor the global reduced-motion rule.
