# Cookie and Tracker Catalogue

The catalogue records name, domain, provider, category, purpose, duration, storage type, party classification, active state, registration source, review date and notes. Unknown discovered trackers retain a null category and `UNKNOWN` status; a database constraint prevents silently classifying them as Essential.

Known Essential storage includes authentication/session cookies, admin verification, `cs_consent` and `cs_consent_anon`. The consent-state cookie contains only policy version, five category booleans, receipt reference, expiry and HMAC integrity. The anonymous token is separate and HttpOnly.

Optional integrations are registry entries for Google Tag Manager, Google Analytics, PostHog, Plausible and Cloudflare Zaraz. They are disabled hook boundaries, not installed SDKs. OneTrust and Cookiebot entries are migration imports only; missing or ambiguous historical choices map to denied.

Withdrawal invokes registered cleanup functions and expires known non-essential cookies where technically possible. Browser or vendor storage that cannot be cleared automatically must be documented in the catalogue and runbook.
