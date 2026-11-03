# CPTO production recovery ? 3 November 2026

Local website implementation and release preparation. No push, merge, deployment, hosted mutation, migration, DNS change, paid infrastructure or provider execution.

## 1. Production and source reconciliation

Live Vercel inspection confirms Production deployment `dpl_AFsCyKcsWaKBjAdS32F3Uyqp2FUM`, READY, CLI source, assigned to www.cybersentinels.com and cybersentinels.com. Exact Production source SHA: **UNKNOWN**. Both get_deployment(withGitRepoInfo=true) and latest Production list return empty metadata and no gitSource. Do not substitute an older deployment SHA or local checkout name. Earlier reports also explicitly lacked this SHA. Rollback target is nevertheless an immutable deployment ID, not a guessed commit.

Live GitHub main: `63a0e0f550f65b4beb3c52afabdba0481b510e69`. Local main: `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`; do not release the stale local branch. Founder checkout HEAD: `b7891662ff98de1d14bfe514a08bd85fcb97a2dd`, with dirty swarm evidence and untracked qualification artifacts preserved. No founder or OneDrive checkout was modified.

Existing cleanup `6583146710a3121734a4655feb79ec3afd9c533e` directly descends from combined candidate `4922c579d4438628f2ebae02c8a3c808ba37f3a3`; their merge base with remote main is `94a530cfacbc4470a3f02ff8b08dfc60cd3e13de`. PR128 `ab88dbfc848ee09f1ef08d28fd3f1d871981165f` is NOT an ancestor of cleanup (the earlier combined candidate applied its patch). Thus neither wholesale cherry-picking the combined candidate nor merging security ancestry is appropriate for this website release.

Open PRs were read from GitHub: #128 security (draft, based on swarm/qualification-hardening); #123 swarm qualification (draft, stacked); #118 swarm control (draft, stacked); #116 recovery/governance (draft); #127 CodeQL, #126 Node types, #125 Supabase CLI, #100 Stripe, #96 CSS tooling, #95 React ecosystem. All excluded. Exact heads are in open-prs.json.

## 2. Website-only candidate

Candidate is an independent local clone under `tmp/website-only-20261103`, branch `release/website-only-20261103`, based on exact live remote main. Its origin points only to the local source checkout. Original worktree metadata lives outside the permitted write area, so an independent clone avoids altering that shared Git directory. No global Git configuration was changed.

Exact release SHA is recorded after commit in the sibling release record `tmp/website-release-20261103.json` (outside this candidate clone). File manifest is manifest.txt, generated from the candidate commit against remote main.

Included: existing equal-height pricing cards and 64px white bottom-aligned CTAs; shared public spacing/footer/summary disclosure; Help's static guidance when Auth is absent; navigation-only language selector with explicit English page-content notice, eight navigation locales, persistence, keyboard support and Arabic RTL labels; safe missing-Auth entry states; public links repaired to public anchors; direct founder-email enquiry fallback.

Excluded: operational trust enforcement, PR128's approval reservation/index and pre-dispatch hardening, all other platform branches, database changes, Auth configuration, provider credentials, backend handlers, dependencies, canonical policy/evidence identifiers and legal document content. Founder narrative remains remote main's version rather than importing unrelated narrative changes from the combined branch. Existing legal draft warnings are retained; no claim of legal approval is made. Draft-marked legal pages therefore still require content-owner/legal approval before the requested approved-content-only public release; this task did not fabricate replacement legal language.

No migrations, new secrets, paid infrastructure, DNS or hosted Auth changes are required by this diff. HOWEVER this is website-only **relative to remote main**, not yet proven website-only relative to the unidentified Production source. Vercel deploys the full Next application; a source deployment is not a marketing-only file patch. Do not deploy this candidate until the backend/source equivalence gate below closes.

## 3. Pricing, Translate and evidence

Prior proof was read and the desktop pricing/header images visually inspected. Prior 73 tests, 16 browser checks, four widths, 150 URLs and zero axe violations on 12 pages remain attributed only to cleanup 6583146 and its combined base. They are not fresh candidate-wide passes. Copies under prior-proof retain their reports; they establish unchanged presentation intent. New candidate-specific proof and results, where present, are in proof/, interactions.json and route-smoke.json.

Page content, product copy, legal pages and resources remain English. Only navigation labels are translated. The selector explicitly states this; no fully multilingual-site claim, external machine translation, false locale pages or hreflang alternatives were introduced. English fallback and document language remain English; Arabic navigation labels retain lang/dir attributes.

## 4. Auth-dependent entries

`/demo/trust-runtime` and `/world-id-preview` now check existing hasPublicSupabaseEnv before creating a client. Missing configuration renders an understandable unavailable state with public destinations. Configured requests still call Supabase getUser and redirect anonymous visitors to login; no fake user, data fixture, broad catch or security bypass. Configured provider failures remain errors rather than fabricated success.

`/access-pending` is absent from remote main and this website candidate. It exists only on the excluded platform branch and depends on Supabase Auth plus account_access_approvals. Its platform-only missing-config issue remains a platform qualification item; adding its approval database dependencies to the website would violate the bounded release. It is not counted as a passing route here.

## 5. API, providers and conversion

Reused prior 350-handler inventory and integration matrix in the earlier candidate artifacts/cpto-closure-20261102. Their 735 local/mocked checks and local PostgreSQL supplier qualification are historical, branch-specific evidence. They do not certify main, this candidate or hosted Production. No blanket rerun of 350 exports.

The source diff against main changes no app/api, lib, middleware, Supabase schema or lockfiles. API keys, delegated authority, ALLOW/REVIEW/DENY, single-use approvals, pre-dispatch revalidation, revocation, tenant isolation, evidence receipts, Replay/Memory and provider failure boundaries are therefore unchanged relative to main. PR128 security fixes remain outside this website release and must be qualified with their migration separately. No valid hosted key, real provider execution or hosted tenant-isolation journey was exercised. Historical intermittent HTTP 500 remains OPEN.

Pricing leads to enterprise enquiry/design-partner/pilot forms. Existing form POST /api/enterprise-access still requires CAPTCHA, applies rate limiting and persists with its existing configured backend. No form was submitted and no email was sent. A visible mailto fallback uses the already published founder address from /funding and opens the visitor's email application; it does not claim automatic delivery. Hosted form delivery remains unqualified.

## 6. Verification

Exact commands/results are in VERIFICATION.md. No unchanged full platform suite rerun. Typecheck, changed TSX lint, focused rendering/auth/website/conversion tests, production build and production-mode browser smoke constitute the final bounded release verification. Dependency resolution for local execution uses the workspace's installed node_modules; Next/React versions match candidate package pins. A deployment should install the candidate lockfile in a clean build environment.

## 7. Decisions and smallest remedies

**Website: NO-GO for immediate Production promotion; local candidate prepared.** Blocking gate: recover the actual Production source/archive and verify all non-website files against this candidate, or establish a reviewed deployment source manifest proving backend equivalence. If Production differs, reapply this bounded manifest onto that source and rerun only affected build/security/smoke checks. Do not use main as a guessed Production SHA. Confirm approval of existing draft-marked legal content, hosted enquiry behavior, and diagnose historical 500s on the affected public paths before promotion. No security downgrade is an acceptable remedy.

**Platform: NO-GO.** Hosted valid-key execution, Auth/tenant isolation, schema/migration compatibility, PR128 index preflight/single use/pre-dispatch checks, provider qualification, receipts/Replay/Memory and intermittent 500 investigation remain gates. Website evidence does not qualify operations.

**Investor hosting: NO-GO.** Isolated hosting/Auth/database target, commercial hosting eligibility and cost approval remain unresolved. No assumption that Hobby is approved for commercial investor use, no provisioning.

## 8. Exact deployment method after gates and founder approval

Use the candidate at the exact SHA in ../website-release-20261103.json only after source equivalence is established. Use the existing `cyber-sentinels-v2` project `prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr` in `keith-speres-projects`, retaining existing production environment bindings. Do not push to main as a deployment shortcut.

1. In an isolated clean checkout of the approved SHA, install its lockfile (`npm ci`) using approved Node 22/npm 10. Verify project/team and source SHA. Link only to the existing project; do not create infrastructure.
2. After explicit approval to read existing environment configuration into that restricted checkout, `vercel pull --yes --environment=production --scope keith-speres-projects`, then `vercel build --prod --scope keith-speres-projects`. Never publish .vercel environment files or secrets.
3. Stage without domain assignment: `vercel deploy --prebuilt --prod --skip-domain --scope keith-speres-projects`. Record returned deployment ID and source SHA explicitly in release evidence. This operation requires founder approval.
4. Run protected staged smoke tests of pricing/Translate/Help/login/public CTAs and API-denial/security boundaries. Hosted enquiry delivery requires a separately approved real submission. Review runtime errors. Promote the tested production deployment only after gates pass: `vercel promote <staged-production-deployment-id> --scope keith-speres-projects`.

## 9. Exact rollback

If the approved release regresses, in the existing linked project run `vercel rollback dpl_AFsCyKcsWaKBjAdS32F3Uyqp2FUM --scope keith-speres-projects`. Verify www.cybersentinels.com, cybersentinels.com, login and key public paths resolve to the retained READY deployment, inspect runtime errors and record alias/deployment state. Rollback disables automatic domain assignment for future deployments; restore it only with a separately approved `vercel promote <verified-production-deployment-id>`. No migration exists in this website diff, so no database rollback is specified. Recheck rollback target is retained immediately before any approved promotion.

## 10. Founder decisions required

No approval is needed for further safe local remediation. Before hosted release: accept verified Production-source reconciliation and the final exact SHA/file manifest; approve the named existing project and staged deployment, environment pull, promotion and rollback operations. Confirm the approved legal content set. Decide whether to authorize a real enquiry delivery test and its recipient. Approval for platform merge/migration/provider operations remains separate. Investor hosting needs a named eligible target and cost budget before provisioning. No approval to push/merge/deploy/migrate/change DNS/spend/alter secrets has been inferred from this request.
