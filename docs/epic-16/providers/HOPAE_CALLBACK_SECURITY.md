# Hopae callback security

Hopae documents `X-Hopae-Signature: t=<unix-timestamp>,v1=<hex-hmac-sha256>`. The signed bytes are `<t>.<exact raw request body>`. Cyber Sentinels reads `request.text()` once, enforces JSON and a 256KB limit, checks the timestamp in both directions, computes HMAC-SHA256, and compares equal-length byte buffers with constant-time comparison before JSON parsing.

The default tolerance is 300 seconds. A valid signature does not establish business uniqueness: the separate provider-neutral ledger atomically reserves `(provider,event_id)`. The callback source digest is SHA-256 of the exact raw body. Duplicate deliveries return a successful idempotent acknowledgement and do not duplicate evidence or trust sinks.

Unsigned callbacks are always rejected when Hopae is enabled. Hopae notes unsigned backwards compatibility for apps without a rotated webhook secret; this deployment does not permit that mode. Configure/rotate a Hopae webhook secret before enablement.

Official reference: [Hopae webhook signature verification](https://docs.hopae.com/guides/webhook-signing).
