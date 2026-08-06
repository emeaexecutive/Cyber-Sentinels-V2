# RC1 worktree inventory

Captured on 2026-08-06 before consolidation from `chore/production-dependency-baseline` at `1166b0a8541a0e853b2dd9dc80d378a71e779987`. The external safety archive preserves the original state. No starting entry is unknown, obsolete, or excluded as unrelated work.

| Path | Git state | Classification | Canonical owner | Include in RC1 | Required action | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `app/enterprise/page.tsx` | Modified | B — Enterprise Trust Platform | Enterprise public experience | Yes | Preserve coordination-route link | Enterprise route test and build |
| `package.json` | Modified | C/G — Decision Intelligence test registration | npm manifest | Yes | Retain focused test in default suite | `test:trust-decision-intelligence` |
| `app/enterprise/trust-platform/page.tsx` | Untracked | B/F — platform coordination and positioning | Enterprise UI projection | Yes | Keep as synthetic coordination view; use native links | Epic 36 and enterprise-experience tests |
| `docs/platform/DESIGN_PARTNER_MODE.md` | Untracked | B/H | Platform documentation | Yes | Retain bounded synthetic flow | Epic 36 test |
| `docs/platform/ENTERPRISE_COORDINATION.md` | Untracked | B/H | Platform documentation | Yes | Retain coordination-only boundary | Epic 36 test |
| `docs/platform/ENTERPRISE_TRUST_PLATFORM.md` | Untracked | B/H | Platform documentation | Yes | Retain canonical reuse statement | Epic 36 test |
| `docs/platform/EXECUTIVE_MODE.md` | Untracked | B/H | Platform documentation | Yes | Retain evidence/unknowns boundary | Epic 36 test |
| `docs/platform/INVESTOR_MODE.md` | Untracked | B/H | Platform documentation | Yes | Retain model-independent moat statement | Epic 36 test |
| `docs/platform/TRUST_REASONING_READINESS.md` | Untracked | B/H | Platform documentation | Yes | Keep future work explicitly untrained | Epic 36 test |
| `src/lib/trust-decision-intelligence/types.ts` | Untracked | C — Trust Decision Intelligence | Decision Intelligence projection contract | Yes | Add Trust Object and Decision History references | Epic 38 contract tests |
| `src/lib/trust-decision-intelligence/object.ts` | Untracked | C | Decision Intelligence projection contract | Yes | Retain fail-closed validation and digest | Epic 38 contract tests |
| `src/lib/trust-decision-intelligence/health.ts` | Untracked | C | Decision Intelligence derived health | Yes | Retain deterministic classification | Epic 38 health tests |
| `src/lib/trust-decision-intelligence/narrative.ts` | Untracked | C | Decision Intelligence narrative projection | Yes | Retain evidence-citation requirement | Epic 38 narrative tests |
| `src/lib/trust-decision-intelligence/executive.ts` | Untracked | C | Decision Intelligence executive projection | Yes | Retain evidence-only reports | Epic 38 executive tests |
| `src/lib/trust-decision-intelligence/modes.ts` | Untracked | C | Decision Intelligence projections | Yes | Reference canonical Trust Object | Epic 38 mode tests |
| `src/lib/trust-decision-intelligence/future-models.ts` | Untracked | C | AI-assistance boundary | Yes | Retain advisory/non-mutating contract | Epic 38 boundary tests |
| `src/lib/trust-decision-intelligence/index.ts` | Untracked | C | Decision Intelligence package | Yes | Retain public exports | Typecheck |
| `docs/platform/TRUST_DECISION_INTELLIGENCE.md` | Untracked | C/H | Decision Intelligence documentation | Yes | Reconcile canonical source matrix | Architecture review |
| `docs/platform/TRUST_DECISION_OBJECT.md` | Untracked | C/H | Decision Intelligence documentation | Yes | Include Trust Object and Decision History | Architecture review |
| `docs/platform/TRUST_DECISION_HEALTH.md` | Untracked | C/H | Decision Intelligence documentation | Yes | Retain exact health rules | Focused tests |
| `docs/platform/TRUST_DECISION_NARRATIVE.md` | Untracked | C/H | Decision Intelligence documentation | Yes | Retain citation boundary | Focused tests |
| `docs/platform/TRUST_DECISION_EXPLANATION.md` | Untracked | C/H | Decision Intelligence documentation | Yes | Retain structured answers | Focused tests |
| `docs/platform/TRUST_DECISION_EXECUTIVE_MODE.md` | Untracked | C/H | Decision Intelligence documentation | Yes | Retain audience and truth boundaries | Focused tests |
| `tests/epic-36-enterprise-trust-platform.test.mjs` | Untracked | G — tests | Enterprise platform contract | Yes | Retain | Focused test |
| `tests/trust-decision-intelligence-epic38.test.mjs` | Untracked | G — tests | Decision Intelligence contract | Yes | Extend canonical reference coverage | Focused test |
| `docs/CYBER_SENTINELS_CAPABILITY_TRUTH_MATRIX.md` | RC1 edit | H — documentation | Capability truth register | Yes | Add explicit RC1 classifications | Documentation review |
| `docs/architecture/RC1_CANONICAL_SYSTEM_MAP.md` | RC1 addition | H — documentation | Architecture registry | Yes | Record canonical owners and overlap classes | Architecture audit |
| `docs/release/ENTERPRISE_TRUST_PLATFORM_RC1_MANIFEST.md` | RC1 addition | H — documentation | Release management | Yes | Record exact release boundary | Release review |
| `docs/release/RC1_PR_RECONCILIATION.md` | RC1 addition | H — documentation | Release management | Yes | Record PR disposition | GitHub inspection |
| `docs/release/RC1_TEST_INVENTORY.md` | RC1 addition | H — documentation | Release management | Yes | Classify focused, default and live gates | npm manifest review |
| `docs/release/RC1_LOCAL_VALIDATION.md` | RC1 addition | H/I — validation evidence | Release management | Yes | Record exact local gates, artifact hashes and environment limits | Two clean qualification cycles |
| `docs/release/REPRODUCIBLE_BUILD_EVIDENCE.md` | RC1 edit | H/I — build evidence | Release management | Yes | Append RC1 two-cycle comparison | Matching route/asset counts and lock hash |
| `docs/release/ENTERPRISE_TRUST_PLATFORM_RC1_ARCHITECTURE_REVIEW.md` | RC1 addition | H — documentation | Architecture review | Yes | Record findings and proof | Final validation |
| `docs/release/RC1_WORKTREE_INVENTORY.md` | RC1 addition | H/I — release evidence | Release management | Yes | Preserve this inventory | Safety bundle and Git status |

## Safety artifact hashes

| Artifact | SHA-256 |
| --- | --- |
| `rc1-before-consolidation.patch` | `81471A6F0D127B8FFD0555C0C35B8884E2F1786DBF6E3E6F33075049B0285387` |
| `rc1-before-consolidation-status.txt` | `B09286C259C4827D6BAE5A26B6A5A6147BF29D42C916D422BA79F40EB7C9B540` |
| `rc1-before-consolidation-untracked-files.txt` | `25CEF8C7C61D84A8C51D1CBF334A4E93162E90ABCEAEA6EBC204681991E84C86` |
| `rc1-before-consolidation-untracked.zip` | `BD73ADB840D81F73519A2383AC9C9CFA1CDFFEAB05F228526A827CE1EE4E888C` |

The archive contains all 23 untracked paths reported at capture time. It is external to the repository and must not be committed.
