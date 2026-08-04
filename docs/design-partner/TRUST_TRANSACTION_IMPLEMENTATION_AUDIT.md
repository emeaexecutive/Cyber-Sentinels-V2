# Trust Transaction Implementation Audit

| Capability | Existing object/service | Reusable | Gap | Duplicate risk | Required change |
| --- | --- | --- | --- | --- | --- |
| Identity subjects | existing runtime and trust identity modules | yes | none | low | reuse existing identity flow |
| Agent registry | new focused design-partner model | partial | missing canonical registry layer | low | implement focused registry model in-repo |
| Owner/operator linkage | existing governance and identity conventions | yes | needs explicit linkage semantics | low | preserve owner/operator separation in the design-partner engine |
| Authority grants | new design-partner authority model | partial | missing canonical authority enforcement | low | implement scoped authority with expiry and revocation |
| Trust decision logic | existing runtime trust pipeline | yes | not yet wired to a dedicated design-partner transaction contract | medium | add a stable evaluate route contract and engine |
| Provider evidence | existing observability and provider evidence conventions | yes | needs normalized evidence boundary | low | reuse the safe redaction boundary and add normalized evidence objects |
| Replay | existing replay engine | yes | no design-partner-specific chronology yet | low | preserve decision and evidence chronology through replay |
| Human review | existing governance workflow concepts | yes | needs explicit review task semantics | low | surface reviewRequired and requiredActions |
| Idempotency | existing trust event and replay concepts | partial | needs deterministic duplicate handling | low | implement idempotency conflict handling in the design-partner engine |

Classification summary:
- canonical and ready: identity subjects, replay, observability boundary
- canonical but incomplete: provider evidence, human review workflow integration
- partial: agent registry, authority grants, trust decision logic
- missing: dedicated design-partner API route and documentation artifacts
