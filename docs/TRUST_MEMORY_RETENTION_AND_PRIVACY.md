# Trust Memory™ Retention and Privacy

Trust Memory is append-only while a record is retained. Append-only does not mean retain forever.

The RC2 retention contract represents tenant retention days, evidence expiry, subject-access state, deletion-request state, legal hold, redaction requirements, derived-data recalculation, provider-reference deletion, approving actor and policy version. Production values require tenant and legal approval; repository defaults do not invent them.

After an approved deletion, expiry or redaction workflow executes, the service records an attributable tombstone event containing the source reference, action, actor, reason, timestamp and recalculation requirement. The tombstone preserves the audit fact without copying the removed raw value; the repository function records proof and does not itself mutate the source. Legal hold fails closed. Provider-reference deletion is not claimed until the provider confirms it.

Data minimization remains mandatory: store normalized evidence, references and decision context; do not retain unnecessary raw identity, biometric, credential or challenge data. Subject access and deletion workflows must remain tenant-scoped. Derived profiles are recalculated after governed removal rather than silently rewritten.
