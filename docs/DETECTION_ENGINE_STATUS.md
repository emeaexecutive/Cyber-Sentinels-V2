# Detection Engine Status

Last audited: 2026-07-06

Cyber Sentinels currently provides deterministic workflow rules, normalized provider evidence, human governance, evidence preservation, replay and enforcement. It does not contain a trained deepfake, synthetic-voice, document-forensics or biometric detection model. A risk field, demo value, configured key or placeholder is not proof that inference ran.

| Detection Area | Current Status | Implementation Type | Evidence in Code | Next Action |
| --- | --- | --- | --- | --- |
| Deepfake image/video detection | Not implemented | Placeholder/review fields | `lib/session-integrity/model.ts`, `app/api/demo/seed/route.ts` | Implement and validate a provider adapter or model before describing results as detection. |
| Synthetic voice | Not implemented | Placeholder/review fields | `voice_clone_risk` fields; no inference call found | Add a governed provider adapter, retained evidence reference and independent validation. |
| Forged documents | Not implemented | Provenance and evidence workflow only | `app/api/provenance/verify/route.ts`, `lib/origin-trace.ts` | Add document-forensics execution; keep provenance separate from forgery conclusions. |
| Session/injection attacks | Active for review | Deterministic rules | `lib/session-integrity/model.ts`, `app/api/session/integrity/route.ts` | Validate thresholds with representative workflows and preserve raw evidence references. |
| Behavioral anomalies | Review only | Heuristic rules | `lib/detection/detection-engine.ts`, trust-engine risk flags | Establish baselines and false-positive review metrics before production blocking. |
| Identity verification | Provider-dependent | Provider orchestration | `lib/providers/registry.ts`, Hopae adapter and World ID/Stripe placeholders | Verify credentials, adapter execution, contract, region and provider health per deployment. |
| AI agent verification | Active governance workflow | Registry, policy and audit rules | `app/api/agents/route.ts`, `app/agent-registry/[id]/page.tsx` | Continue least-privilege, retention, oversight and revocation validation. |
| Provenance checks | Review only | Metadata/evidence workflow | `app/api/provenance/route.ts`, `lib/trust-timeline/provenance.ts` | Distinguish signed provenance validation from missing or self-asserted metadata. |
| Trust score calculation | Active | Deterministic rules plus normalized provider signals | `lib/trust-score.ts`, `lib/trust-score-engine.ts` | Display the source and retain the rule breakdown with every score. |
| Blocking/removal workflow | Active, admin-only | Governed enforcement | `lib/admin/fake-actors.ts`, `app/api/admin/fake-actors/*` | Monitor audit-write failures and require governance review for disputed results. |

## Runtime truth

`GET /api/detection/status` and `/admin/detection-status` expose the same server-side inventory. The API is admin-protected and never returns secret values. Provider states use `Live`, `Awaiting Credentials` or `Disabled`. Credentials without an implemented adapter remain `Disabled`.

The current trust-score source is `Heuristic Baseline`, or `Provider API` when normalized provider signals contribute. Demo workflows must use `Demo Data`. `Real ML` is reserved for verified model inference and is currently inactive.

## Enforcement guarantees

Fake-actor actions block, remove from workflow, escalate, mark false positive, or export an evidence summary. Existing enforcement writes an audit event before state changes, preserves an evidence snapshot, updates candidate/session risk state and governance state, retains replay/receipt links, and performs no silent deletion.

## Claim boundary

Approved: “Heuristic rule-based signal,” “provider-backed verification evidence,” and “requires governance review.”

Not supported: “AI detected fake,” “confirmed deepfake,” model accuracy percentages, or a claim that credentials alone activate detection.
