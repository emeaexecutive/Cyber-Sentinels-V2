# EU AI Act Serious-Incident Product Boundary

## Operational context

Cyber Sentinels supports organizations in preserving operational evidence relevant to an AI serious-incident review. It keeps technical facts, provider assertions, Cyber Sentinels operational screening, authorized organizational decisions, legal conclusions, and regulator responses separately attributed.

This document is a product boundary, not legal advice. Customers must obtain current specialist advice for their systems, roles, jurisdictions, classifications, facts, and deadlines.

## Article 55 reporting-support boundary

Where customers identify Article 55 or another EU AI Act provision as potentially relevant, Cyber Sentinels can preserve the supplied framework reference, system and organizational classifications, awareness chronology, evidence limitations, potential operational triggers, reviewer decisions, packages, external submission evidence, and corrective actions.

The product does not decide whether Article 55 applies, determine GPAI systemic-risk status, establish liability, calculate a legal deadline without an approved source, or certify that a package meets a legal obligation. Regulatory and legal classifications must remain attributed to the party that supplied or approved them.

## EU SEND boundary

Cyber Sentinels does not implement or claim direct EU SEND submission in Epic 27. It may record evidence of a submission completed through an external channel and link the exact approved package version and digest. It does not store portal passwords, authentication cookies, session tokens, or private API credentials. A portal acknowledgement is evidence of receipt only, not regulator agreement or acceptance.

## Customer responsibilities

The customer remains responsible for:

- identifying applicable law, contractual duties, organizational roles and competent authorities;
- supplying accurate system classification, jurisdiction, GPAI/systemic-risk status and operational facts;
- designating authorized technical, security, compliance, data-protection, legal, executive and liaison reviewers;
- determining organizational awareness and materiality;
- approving any legal deadline source and rationale;
- deciding whether reporting is required or not required;
- approving and transmitting packages through authorized channels;
- protecting external-portal credentials outside Cyber Sentinels;
- responding to regulator requests and validating corrective measures.

## Legal-review responsibilities

Authorized legal and compliance reviewers determine legal relevance, reporting decisions, package approval, limitations, conditions and superseding conclusions. Cyber Sentinels validates role assignment and preserves the decision lineage; it does not replace the reviewer’s judgment.

## Regulator boundary

Only an external authority can issue its own acknowledgement, clarification, request, rejection, classification or conclusion. Cyber Sentinels records those supplied facts with their source and timestamp. It does not claim regulator approval, acceptance, certification, or legal sufficiency.

## Non-certification disclaimer

`regulator_ready` means an internal package is prepared, reviewed and approved according to the customer’s configured workflow. It is not a certification, legal opinion, guarantee of compliance, guarantee of acceptance, or determination that evidence is complete for law.

## No automatic legal conclusion

The deterministic relevance engine is labeled **OPERATIONAL SCREENING — NOT A LEGAL CONCLUSION**. It can surface potential triggers, missing evidence and recommended specialist roles. It cannot set `reporting_required`, `not_reportable`, liability, legal sufficiency, or compliance.

## Deadline provenance

Cyber Sentinels does not calculate a legal deadline unless either:

1. a configured, authorized policy supplies the rule; or
2. an authorized reviewer supplies the deadline.

Every deadline records whether it is reviewer supplied, policy supplied, externally supplied, or unknown, together with rule source, calculation rationale, timezone, uncertainty and approval. Unknown remains a first-class state.

## Evidence and data minimization

The evidence workflow stores normalized facts, digests and masked references where sufficient. It rejects plaintext credentials, secrets, raw tokens, exploit payloads, full prompts and unnecessary personal or complete telemetry data. Original snapshots and decisions are append-only; later evidence creates correction and supersession records.
