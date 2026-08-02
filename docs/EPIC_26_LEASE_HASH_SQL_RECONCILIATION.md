# Epic 26 lease-hash SQL reconciliation

## Preview evidence and application status

The disposable PR #16 Preview reached `202607310001_environment_attestation_scope_continuity.sql` after the Enterprise Trust Graph correction. Migration statement 32 failed with SQLSTATE `42601` while PostgreSQL parsed the `lease_hash` declaration in `persist_scope_continuity_decision_v1`.

The linked Production ledger records `202607310001` as remote-blank, and the Preview failure occurred before the migration transaction completed. No retained persistent staging branch contains the migration. The source is therefore corrected before its first durable application; Production is not changed and requires no migration-ledger repair.

## Root cause and call map

The original canonical-text expression was:

```sql
encode(digest(convert_to((((p_input->'authorization')-'consumedActionCount')-'createdAt')-'immutableHash')::text,'UTF8'),'sha256'),'hex')
```

It contained six opening parentheses and seven closing parentheses. Its intended call map was:

```text
encode(
  digest(
    convert_to(
      JSONB authorization minus volatile fields :: text,
      UTF8
    ),
    sha256
  ),
  hex
)
```

The compact subtraction form opened only three nested JSONB groups beyond `convert_to(` but closed four. PostgreSQL therefore reached an unmatched closing parenthesis at the end of the JSONB expression.

## Canonical immutable lease input

The SQL hash consumes the validated `authorization` JSONB object after removing only:

- `consumedActionCount`, which is derived mutable usage state;
- `createdAt`, which is not part of `ScopeAuthorizationLease`; and
- `immutableHash`, which must never recursively hash itself.

The remaining immutable contract is exactly the TypeScript `authorizationFields` boundary: lease and enterprise identifiers; subject type/id; objective; permitted tools, actions, targets and environments; duration/action ceilings; data boundary; approver type/id; issued/expiry/revocation state; required attestations; contradiction policy; authority/evidence references; and supersession identity.

Execution-context identity and correlation are decision-level bindings, not lease fields. Policy ID/version is bound by `decisionHash`; adding it to the lease hash would change the established lease contract. Database insertion time is not hashed.

Validated set-like arrays are deduplicated and sorted by the TypeScript boundary before persistence. Optional values are normalized, JSONB object text has deterministic key ordering, UTF-8 is explicit, and output remains lowercase 64-character SHA-256 hexadecimal text.

## Correction

The corrected expression uses one readable JSONB group and the same left-associative field removals:

```sql
encode(
  digest(
    convert_to(
      (
        p_input->'authorization'
        - 'consumedActionCount'
        - 'createdAt'
        - 'immutableHash'
      )::text,
      'UTF8'
    ),
    'sha256'
  ),
  'hex'
)
```

No hash input, output type, digest algorithm, idempotency key, immutable-identifier conflict check, or retry behavior changes.

## Other Epic 26 hashes

- `context_hash` hashes the complete validated declaration minus only a possible recursive `immutableHash`; `enterpriseId` and `createdAt` remain bound.
- `item_hash` hashes each complete validated attestation minus only a possible recursive `immutableHash`; enterprise, execution context, source, evidence, timestamps and supersession remain bound.
- `decisionHash` is created by TypeScript JCS canonicalization over the complete unsigned decision, including enterprise, context, authorization reference, request, policy ID/version, correlation and chronology. SQL validates its SHA-256 shape and rejects a changed retry sharing the tenant/context/correlation identity.
- `hashtextextended` is used only for the transaction advisory lock over enterprise, context and correlation; it is not an evidence digest.

No raw credentials or provider payloads enter these digests. The focused static test checks balanced SQL calls, the three digest pipelines, the immutable field boundary, deterministic lease hashing, tenant/subject/scope/expiry sensitivity, null/empty separation, canonical ordering, policy-bound decision hashes and changed-retry rejection.
