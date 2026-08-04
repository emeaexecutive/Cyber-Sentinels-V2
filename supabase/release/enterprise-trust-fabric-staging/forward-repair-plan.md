# Forward-repair plan

1. Stop at the current phase boundary and record the migration, statement ordinal, SQLSTATE, catalog identity and migration head without rows or credentials.
2. Confirm the target remains the registered staging project and synthetic mode is still active.
3. Classify the failure as prerequisite drift, namespace collision, lock/performance risk, RLS/grant drift or application compatibility.
4. Author a new forward migration; never edit an applied migration or repair the Production ledger.
5. Re-run collision, destructive SQL, dependency, architecture-freeze and package-hash review.
6. Recreate the isolated staging boundary and repeat from the last approved phase only after human approval.

Production repair, deployment and promotion are outside this package.
