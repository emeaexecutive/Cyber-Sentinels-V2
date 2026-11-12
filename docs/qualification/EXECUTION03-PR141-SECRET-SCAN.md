# PR141 secret-scan remediation

Run 43242473800 at 170da71528b4c65edfd907db0453b8e6973da58e scanned 906 commits and flagged 21 historical records. Gitleaks 8.28.0 reproduced exactly the same 21 fingerprints using all published origin refs, with 100% redaction. Each finding is listed by rule, path, commit and fingerprint in the adjacent JSON; no matched values are recorded there.

All findings originate in published SOC artifact commits 9ccf1b1 and a0ae7ac, outside PR141's website changes. Eighteen fields are SHA256 fingerprints of enrolled public keys, and three are synthetic UUID idempotency keys. Original committed fields were inspected securely and matched the previously reviewed PR138 triage exactly. These are nonsecret metadata, not private key material or authentication credentials. No genuine exposed secret was identified; credential revocation, rotation and Git history rewriting are therefore unnecessary for these findings.

Only the 21 exact historical fingerprints are added to the existing verified-fixture list. Scanner rules, full-history checkout, configuration and workflow are unchanged. A new workflow at the corrected head is required; the failed old head cannot pass without the correction.
