# RC6 webhook replay ledger

Hopae retains provider-specific normalized evidence while the RC6 provider-neutral intake ledger covers both Hopae and Stripe. Each integration reserves a provider/event ID before business processing, hashes the payload, rejects duplicates, and records signature, processing, failure, audit and retention state. Rejected bodies are identified only by a SHA-256 digest.

Both ledgers have RLS enabled and deny `anon` and `authenticated`; server-side service-role code is the only writer. Raw Hopae payload retention remains disabled. Ledger deployment and real replay proof remain blocked until the RC6 migration is applied and target callbacks are exercised.
