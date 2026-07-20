# Consensus Decision Runbook

For an unexpected state, retrieve the decision and explanation by tenant, then verify the policy version, decision hash, evidence snapshot hash, included/ignored observations, freshness, health, independence groups, correlation penalties, conflicts and prior-state link.

Use historical replay at the original timestamp to reconstruct the outcome. Use simulation—not data mutation—to compare a policy override, evidence exclusion or provider outage. If reconstruction diverges, stop automated use of the decision and investigate policy/version drift or integrity failure.

For `CHALLENGED`, follow step-up or manual-review policy. For `BLOCKED`, confirm the critical negative evidence and operational denial rule. For `REVOKED`, confirm the authoritative revocation and affected prior decision. Never edit a canonical decision or its evidence rows; corrective evidence produces a new observation and evaluation.

Rollback is forward-only: deactivate a policy through a new version, restore a previously reviewed policy as another new version, and re-evaluate affected subjects. Database rollback must not delete decision lineage.
