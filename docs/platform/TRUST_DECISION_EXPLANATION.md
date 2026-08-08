# Trust Decision Explanation

## Required answers

Every Epic 38 explanation answers the following from preserved fields:

| Question | Source |
| --- | --- |
| Why? | Citation-bearing `why` statements |
| Which evidence? | Complete `whichEvidence` list and supporting evidence |
| Which authority? | Authority Lineage decision-time snapshot |
| Which policy? | Trust Policy decision-time snapshot |
| Which provider? | Provider participation and evidence references |
| Which human? | Human reviewer and review reference, or explicit null |
| Which AI? | AI participation and output references |
| Which uncertainty? | Known unknowns and uncertainty list |
| Which assumptions? | Citation-bearing assumption statements |
| What changed afterwards? | Citation-bearing evolution and changed-afterwards statements |

## Confidence

Confidence is preserved both with the trust state and as a classification. It must be between zero and one. Its rationale must cite evidence. Confidence is not certainty, and an open unknown remains open regardless of confidence.

## Participation semantics

Providers contribute normalized evidence and limitations. Humans contribute an attributable review disposition and cited rationale. AI contributes bounded explanatory or recommendation output. None of these fields silently transfers final authority away from the recorded decision owner and policy/authority snapshots.

## Audit interpretation

The explanation should be read together with Replay for chronology, Evidence Graph for provenance, Authority Lineage for permissions, Trust Memory for reviewed history, and Trust Journey for end-to-end context. The object links those sources rather than substituting for them.
