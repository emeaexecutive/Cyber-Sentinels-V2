# Final Demo Readiness Lock

## Demo path

Use this sequence:

1. `/` — introduce operational trust.
2. `/demo` — explain the hiring workflow in under 90 seconds.
3. `/enterprise/hiring-security` — establish the enterprise problem and workflow.
4. `/verify/candidate` — show authenticated candidate intake and review-safe states.
5. `/trust-center` — show authenticated operational Trust Posture.
6. `/replay/demo` — inspect the deterministic synthetic Replay Timeline.
7. `/verification/receipt/demo` — inspect the matching synthetic Verification Receipt.
8. `/admin/test-lab` — show the protected rule-based validation lab with an authorized admin account.

The two `/demo` evidence records are intentionally public, deterministic and synthetic. Real replay, receipt, trust-center and admin records remain protected.

## What works

- Homepage positioning and primary demo entry.
- Password sign-in and account creation with confirm-password gating.
- Magic-link and forgot-password flows.
- Verification-email guidance and resend path.
- Candidate intake with bounded workflow states.
- Replay chronology, Evidence Chain, Governance Review, reviewer attribution and Trust Posture.
- Verification Receipt continuity.
- Protected validation lab and provider status controls.

## What is simulated

- `/replay/demo` and `/verification/receipt/demo` use a controlled hiring-workflow fixture.
- The provider response, session anomaly and governance outcome in that fixture are clearly labelled simulated.
- Validation-lab scenarios exercise explainable rules; they are not accuracy benchmarks.

## What needs credentials

- Supabase authentication and persisted operational records.
- Hopae Connect and any other enabled provider adapter.
- Stripe and email-delivery operations.
- Cloudflare Turnstile when enabled for production forms.

Provider status uses only:

- Live
- Simulated
- Awaiting credentials
- Disabled

“Live” means a supported code path is enabled and configured. It is not a health, accuracy or identity-certainty claim.

## Known limitations

- Configuration presence does not prove provider uptime.
- Real workflow continuity depends on source records, timestamps and reviewer attribution.
- The deterministic demo does not call external providers or write customer records.
- Admin Test Lab requires verified, authorized admin access.
- Browser walkthroughs should be repeated against the deployed environment before each external presentation.

## Investor-safe wording

Cyber Sentinels coordinates provider-backed verification signals, governance review, replayable evidence and workflow Trust Posture.

The platform does not claim autonomous truth detection, guaranteed fraud detection, biometric certainty or universal deepfake accuracy.
