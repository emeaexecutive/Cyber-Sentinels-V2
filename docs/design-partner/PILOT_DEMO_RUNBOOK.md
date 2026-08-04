1. Start from the design-partner trust engine and register one active agent with one accountable owner and operator.
2. Issue one authority grant with explicit expiry, repository, branch and environment scope.
3. Submit one high-risk action request with a stable idempotency key and correlation ID.
4. Observe allow, review or deny behavior from the engine based on the supplied evidence and scope.
5. Review the resulting decision digest, reason codes and required actions.
6. Re-submit the same idempotency key to confirm the original decision is preserved.
7. Re-submit with a changed payload and a reused idempotency key to confirm the conflict path is denied.
8. Record the result in the pilot evidence report template.
