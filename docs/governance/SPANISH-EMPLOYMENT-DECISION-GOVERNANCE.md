# Employment Decision Governance

## Purpose and boundary

Employment decisions remain customer decisions. An AI finding is evidence, not an employment decision; an AI recommendation is not independent human review; an authenticated reviewer is not necessarily authorized; and an `ALLOW` from a trust transaction does not prove external execution.

The implementation records system/model/provider provenance, policy version, original finding and evidence references, reviewer authority, review actions and rationale, challenges, evidence-backed overrides, final human determination, and disclosure delivery evidence. It uses the existing tenant policy registry, Trust Contracts, canonical Trust Events, Replay references and Trust Memory index. It does not score candidates, recommend a hire/no-hire result, or establish that a reviewer's judgment was independent.

## Spanish source review

The official BOE record for [Real Decreto 723/2026 (BOE-A-2026-19200)](https://www.boe.es/buscar/doc.php?id=BOE-A-2026-19200) identifies publication in BOE no. 228 on **15 September 2026**. Final Provision 4 sets entry into force twenty days after publication: **5 October 2026**.

Article 2(1) applies the decree to employers and workers within Article 1 of the Estatuto de los Trabajadores, subject to its stated qualifications. Article 2(2) limits Chapter II to employment relationships lasting more than four weeks. Article 3(2)(k) requires written information to workers about the existence of algorithmic or automated decision-making systems, including their operating criteria and rules when used to determine or set/change working conditions, including working time, task assignment, pay, career progression, work location, or termination. Articles 5-7 address changes, accessible written/electronic delivery with proof of transmission or receipt, and timing. Applicability depends on the actual employment relationship, system use, and statutory scope.

This is a worker-facing employment-conditions transparency provision. It does **not**, by itself, establish a universal candidate-screening notice requirement or settle when recruitment activity becomes an employment relationship. GDPR transparency and automated-decision rights, EU AI Act high-risk employment-system obligations, Spanish labour/equality rules, collective agreements, and any sector-specific requirements need separate applicability analysis.

The supplied official [AEPD warning AI-00009-2026](https://www.aepd.es/documento/ai-00009-2026-advertencia.pdf) is reachable as a PDF, but its text could not be reliably extracted or independently read in this review. No specific obligation is attributed to it or encoded here. Legal/Privacy must review the complete warning and approve any resulting policy changes.

## Runtime policy contract

An active tenant `trust_policy_versions` record must bind `employmentDecisionGovernance.humanReviewRequired: true` and an explicit boolean `disclosureRequired`. The latter is a customer policy setting, not an automated legal conclusion.

Example policy fragment (the owning workspace must approve and version it):

```json
{
	"employmentDecisionGovernance": {
		"humanReviewRequired": true,
		"disclosureRequired": true
	}
}
```

Reviewer authority is re-read from the latest tenant Trust Contract for that human at each review, override, and determination. The contract must be active, issued, unexpired, not superseded by a later revoked record, and include `employment_decision_reviewer`. The case creator cannot complete the independent review or final determination. Review evidence requires multiple meaningful actions, a substantive rationale, and linked original evidence; these controls capture process signals and cannot conclusively prove human independence.

Disclosure capture requires a tenant-scoped delivered verification receipt matching the notice version, SHA-256 digest, opaque recipient reference, and transmission timestamp. This records evidence of a delivery claim; it does not establish that the recipient understood the information or that the content was legally sufficient.

Policy-exception requests are append-only and explicitly `PENDING_NOT_EFFECTIVE`; they do not change the active policy or bypass required review/disclosure gates.

Cases use opaque `candidate:` references and evidence references, not candidate names or original document payloads. Before production use, the tenant must set and review a lawful retention period and deletion/erasure process for event facts, hashes, references, receipts, Replay, and Trust Memory. Append-only audit history does not override data-subject rights or create a lawful retention basis.

## Legal review required

Before enabling a policy in a real hiring workflow, counsel and the Data Protection Officer should document jurisdiction, worker/candidate status, controller/processor roles, purpose and lawful basis, notice recipients/timing/content, any Article 22 analysis, human intervention and contestability, EU AI Act role/classification and applicable dates, equality/fairness safeguards, accessibility, retention, and cross-border/data-transfer controls. This software is governance evidence infrastructure, not legal advice or automatic compliance certification.