# AI assistance boundary

The provider-neutral `TrustIntelligenceModelAdapter` may draft explanations, summarize supporting evidence, group semantically similar cases, retrieve relevant history, draft reviewer questions, draft requested evidence, and translate a technical summary for a role.

Every adapter envelope records provider/model/version, prompt-template version, request digest, redaction state, supplied evidence references, classification, limitations, timestamp, correlation and review state. Raw prompts, secrets and raw customer payloads are prohibited from persistence.

Allowed output labels are `ai_draft`, `evidence_retrieval_result`, `semantic_similarity_result`, `reviewer_assistance`, `translated_summary`, and `unverified_suggestion`. AI output is never a verified fact, canonical decision, legal conclusion, confirmed root cause or independently observed evidence.

The default adapter returns `not_configured` and fabricates nothing. Sensitive evidence is redacted before any adapter call. Text inside evidence—including prompt-injection language—is untrusted data and cannot alter system instructions, policy or canonical state. Customer evidence cannot be used for training without explicit documented authorization.
