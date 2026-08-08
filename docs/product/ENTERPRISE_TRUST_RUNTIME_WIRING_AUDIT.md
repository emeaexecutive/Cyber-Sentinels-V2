# Enterprise Trust Runtime Wiring Audit

## Summary

This audit classifies the major runtime systems against the canonical Operational Entity spine.

| System | Existing subject model | Canonical owner | Operational Entity status | Duplicate risk | Required fix |
| --- | --- | --- | --- | --- | --- |
| Trust Object | trust object subject | Trust Object | Partial | Medium | Resolve and preserve one Operational Entity reference |
| Trust Contract | contract subject | Authority lineage | Partial | Medium | Bind each contract to an Operational Entity |
| Trust Fabric | trust object | Trust object / workflow | Partial | Medium | Treat Operational Entity as the canonical subject context |
| Operational Trust | trust posture | Trust Object | Partial | Medium | Project from Operational Entity evidence and decisions |
| Trust Continuity | continuity state | Trust Object | Partial | Medium | Re-evaluate from entity-aware evidence and authority changes |
| Canonical Trust Transaction | trust object + actor | Transaction | Partial | High | Resolve Operational Entity before decision evaluation |
| Authority Lineage | grant chain | Authority grant | Partial | Medium | Require governed Operational Entity ownership |
| Evidence Graph | evidence graph node | Evidence graph | Partial | Medium | Connect every entity-specific edge to Operational Entity |
| Enterprise Decision History | transaction / decision | Trust transaction | Partial | Medium | Persist operationalEntityId and entity context |
| Replay | replay event | transaction | Partial | Medium | Store operationalEntityId and entity lineage |
| Trust Memory | trust memory event | event | Partial | Medium | Emit only material events with operationalEntityId |
| Provider Evidence | provider evidence record | provider session | Partial | Medium | Bind to entity and owner via Operational Entity |
| TracFace | identity profile | identity record | Partial | Medium | Resolve every identity profile to one Operational Entity |
| Incidents | incident record | incident | Partial | Medium | Link incident to Operational Entity and transaction |
| Corrective Action / Recovery | corrective action | incident | Partial | Medium | Record entity-aware recovery evidence |
| Trust Journey / Trust Decision Intelligence | derived narrative | decision / evidence | Partial | Medium | Derive from Operational Entity + evidence + decisions |
| AI explanation | narrative | decision context | Partial | Medium | Ground all statements in canonical evidence and Operational Entity |
| APIs | request subject | actor/tenant | Partial | Medium | Resolve and require Operational Entity for trusted execution |
| Trust Centre / demos | demo narrative | experience | Partial | Medium | Show the entity-aware runtime chain end to end |
