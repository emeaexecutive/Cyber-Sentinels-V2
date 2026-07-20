# Consensus Policy Model

The safe default policy requires mandatory identity evidence, a score of 75 and two independent groups for `VERIFIED`, or a score of 50 and one group for `TRUSTED`. Material contradictions produce `CHALLENGED`; critical or threshold-level negative evidence produces `BLOCKED`; authoritative revocation produces `REVOKED`. Missing mandatory evidence or only zero-weight evidence produces `INCONCLUSIVE`.

Each policy has an immutable version, activation flag, validity timestamp, mandatory signals, verified/trusted/blocking thresholds, independent-group minimums, correlation penalty, stale-evidence behavior and signal multipliers. Policy mutations create a new version and `consensus.policy.changed` Trust Event. Production policy changes require simulation and governance review; API availability is not permission to skip change control.

World ID alone can never satisfy any positive threshold. Placeholder and unknown providers cannot be made positive through policy multipliers because capability eligibility is evaluated first.
