# Trust Decision Contracts

A Decision Contract binds enterprise, domain, subject, optional workflow/authority, policy ID/version, evidence snapshot hash, input hash and request time. It uses JCS/SHA-256 and a deterministic UUID.

The contract is fixed before state evaluation. Any evidence-snapshot mismatch fails closed. The resulting state decision repeats the contract hashes so Replay can prove exactly which inputs governed a transition.
