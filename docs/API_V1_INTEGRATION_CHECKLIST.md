# API V1 customer integration checklist

Use this checklist in a non-Production Preview or Staging environment before requesting Production access.

- [ ] Obtain the approved base URL; do not guess Preview hostnames.
- [ ] Create a least-privilege API key in Developer → API Keys and copy the secret once.
- [ ] Store the secret only in an environment variable or managed secret store. Never put it in source, logs, URLs, screenshots, tickets, or browser storage.
- [ ] Select only required scopes. The complete Customer Zero owner/admin flow uses `agents:write`, `agents:verify`, `authority:read`, `authority:write`, `trust:request`, `trust:read`, `evidence:write`, `outcomes:write`, `review:read`, and `review:write`; ordinary agent integrations should omit administrative scopes.
- [ ] When selecting `authority:write`, configure a server-persisted authority-management boundary for permitted actions, target prefixes, purposes, environments, and maximum TTL. API scope alone is not business authority.
- [ ] Plan expiry, rotation and revocation. Rotation returns a new one-time secret and revokes the replaced key.
- [ ] Register one agent and retain `agent_id`; do not treat knowledge of an ID as authorization.
- [ ] Understand the V1 boundary: registration creates `PENDING_IDENTITY_PROOF` and grants no business authority. After successful identity proof, an owner/admin principal may create a bounded, expiring, non-delegable authority version and may revoke it monotonically.
- [ ] Register an Ed25519 public credential. Keep the private key outside Cyber Sentinels.
- [ ] Sign and register Manifest 1.0, issue a challenge, and submit proof.
- [ ] Grant bounded authority, then retrieve both the current projection and immutable authority history; verify allowed actions, targets, environment, version, expiry, and supersession.
- [ ] Submit a permitted decision with a unique `Idempotency-Key` and matching body `idempotency_key`.
- [ ] Handle only `ALLOW`, `REVIEW`, and `DENY`. `ALLOW` authorizes the exact evaluated action; it is not evidence that execution occurred.
- [ ] Stop on `REVIEW`. Use `review_reference` to retrieve the governed review. Only an owner/admin/reviewer principal with `review:write` may resolve it; the agent cannot self-approve.
- [ ] Confirm an `APPROVED` review leaves the original canonical decision as `REVIEW` and requires a new decision request with a new idempotency key.
- [ ] Persist `request_id`, `correlation_id`, `decision_id`, `transaction_id`, `receipt_id`, and `replay_id` in safe application telemetry.
- [ ] Retrieve and retain the receipt and Replay according to your evidence policy.
- [ ] Submit an outside-authority action and prove it returns `DENY`; retrieve its receipt and Replay too.
- [ ] Revoke the authority, preserve the revocation reference and immutable authority version, then submit a later decision with a new idempotency key and prove it does not return `ALLOW`.
- [ ] Treat public `/evidence` submissions as `AGENT_ASSERTED`. They are not server-verified, provider-verified, or independent evidence and cannot self-promote.
- [ ] If supplying a digest, compute it exactly as the executable client does and handle `EVIDENCE_DIGEST_MISMATCH` as a hard failure.
- [ ] Submit outcomes only for a transaction owned by the authenticated tenant/client and never report success for `REVIEW` or `DENY`.
- [ ] Retry transient 503 responses with bounded backoff. For 429, honor `Retry-After`; never vary correlation IDs to evade limits.
- [ ] Treat DNS failure, timeout, 429, 500, and 503 as unavailable, never as ALLOW. Define an operator escalation and recovery policy.
- [ ] Retry a timed-out decision with the same idempotency key and unchanged semantic request. Use a new key for a changed request.
- [ ] Handle typed 401, 403, 404, 409, 413, 415, 429, 500 and 503 failures without displaying raw internal diagnostics.
- [ ] Set SDK timeouts and pass `AbortSignal` for cancellation. The repository-local TypeScript SDK is explicitly unpublished.
- [ ] Confirm authenticated responses are `private, no-store` and do not add shared caching.
- [ ] Do not add wildcard CORS for authenticated mutations. Server-to-server integration is the supported boundary.
- [ ] Run the bounded performance harness only against local, Preview, or Staging and label results as non-Production.
- [ ] Prove a second API client and a second tenant cannot use or retrieve the first client’s agents, transactions, receipts, Replay, evidence subjects, or outcomes.
