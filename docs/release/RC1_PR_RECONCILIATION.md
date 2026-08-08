# RC1 pull-request reconciliation

GitHub state was inspected on 2026-08-06 for `emeaexecutive/Cyber-Sentinels-V2`.

| PR | State | Classification | RC1 disposition |
| --- | --- | --- | --- |
| #18 Gitleaks action | Merged | Included upstream and hardened by RC1 baseline | Retain immutable pin and security review |
| #19 Stripe 22.4.0 | Closed, unmerged | Superseded by #28 | Coordinated Stripe/API-version change is already in RC1 branch |
| #20 React DOM/types | Closed, unmerged | Superseded by #28 | Coordinated React runtime/type alignment is already in RC1 branch |
| #21 PostCSS | Merged | Included upstream and reconciled by #28 | Retain with Autoprefixer and CSS evidence |
| #22 React/types | Merged | Included upstream and reconciled by #28 | Retain exact React/React DOM pairing |
| #23 Autoprefixer | Merged | Included upstream and reconciled by #28 | Retain with PostCSS |
| #24 CodeQL | Merged | Included upstream and hardened by #28 | Retain reviewed immutable pin |
| #25 Operational Trust positioning | Merged | Required RC1 base capability | Retain truthful no-blueprint positioning |
| #26 Enterprise Trust Learning | Open draft, independent | Excluded product work | Do not merge, close, copy, or claim in RC1; reconcile separately after RC1 |
| #27 coordinated React upgrade | Closed draft, unmerged | Superseded by #28 | Equivalent coordinated work is preserved by #28 |
| #28 Production Dependency Baseline | Open draft, current branch | RC1 PR to update | Re-title and update in place after final RC1 push; do not create a duplicate PR |

No PR is closed, merged, or marked ready by RC1 consolidation. PR #26 remains preserved on its own branch.
