# Rollback and Forward Repair Runbook

| Release phase | Reversible before traffic | Reversible after traffic | App rollback | Schema forward-only | Data-preserving rollback | Forward repair required | Stop condition | Approval owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Preflight | Yes | No | Yes | No | Yes | No | Migration head mismatch | release owner |
| Migration | No | No | No | Yes | No | Yes | Partial migration | database owner |
| Application rollout | Yes | Yes | Yes | No | Yes | No | RLS or auth regression | release owner |
| Evidence publication | No | No | No | No | No | Yes | Evidence corruption | security owner |
