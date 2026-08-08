# Trust Decision Health™

## Epic 38 classification

Decision Health is a deterministic view of the preserved decision and its evolution. It is not a trust score and does not modify the decision.

| State | Rule |
| --- | --- |
| Incomplete | Runtime validation or integrity validation fails. |
| Superseded | A superseding decision reference exists. |
| Expired | The recorded outcome expiry is at or before the assessment time. |
| Pending | The enterprise outcome remains pending. |
| Contradicted | Later evidence or a correction explicitly contradicts the original outcome. |
| Recovered | A recovery entry or canonical recovery reference exists. |
| Changed | Subsequent evidence, correction, review feedback, or a later outcome changed the record without contradiction or recovery. |
| Stable | None of the preceding conditions applies. |

Precedence is deliberate: an invalid record is Incomplete; a valid superseded record is Superseded before other temporal states; contradiction is retained even when it is uncomfortable. Reasons are returned with every assessment so the classification is explainable.

## Decision evolution

The evolution contract supports Original Decision → Subsequent Evidence → Correction → Reviewer Feedback → Recovery → Final Enterprise Outcome. The original entry is always first and later entries must be chronological. Stages may be absent when they did not occur; they are never fabricated to make a journey appear complete.
