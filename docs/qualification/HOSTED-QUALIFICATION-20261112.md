# Hosted metadata inspection — 12 November 2026

Read-only Vercel plugin queries verified the following existing Preview artifacts remain READY in project `prj_7v7vbNXHaf7gfAqYjGxRMQEB8FAr`:

| Candidate | Commit | URL |
|---|---|---|
| PR136 bilingual watchtowers | `582acc889afbe59991ea307bc5e4a2b986b11c0e` | https://cyber-sentinels-v2-ljflhg0l1-keith-speres-projects.vercel.app |
| PR133 EN/ES public completion | `13a3485bb8a6ec8af720ec579bcf6b357003dec6` | https://cyber-sentinels-v2-fnbox7uox-keith-speres-projects.vercel.app |
| PR137 TypeScript fix | `efb3a64036b984c309f4ac45c7a54e819a3c777e` | https://cyber-sentinels-v2-lfdqr060r-keith-speres-projects.vercel.app |

All have target null (Preview). These are deployment metadata checks, not new HTTP/rendering, auth, RLS, provider or SOC functional tests. Historical November8/9 public smoke captures remain limited to their exact tested artifact.

A branch-filtered deployment query for `codex/governed-soc-runtime-20261112` returned **zero deployments** at inspection. The new SOC candidate is **NOT HOSTED / UNQUALIFIED**. No deployment or promotion was requested by this workstream.

The most recent listed Production-target deployment is `dpl_HX9XAvn1SB7DQHbFeU3VfhEXit4G`, READY, CLI source, at https://cyber-sentinels-v2-mnadxhufo-keith-speres-projects.vercel.app . Its metadata has no Git SHA and no aliases; listing a Production-target artifact does not establish the source currently serving a public domain. No current Production SHA is inferred.

This inspection did not create share links or fetch functional endpoints, change protection, query secrets, write hosted fixtures or mutate any project. Supabase/Staging live schema was not rechecked; prior absent RPCs and drift remain historical blockers pending a fresh approved scope check.

Vercel deployments skill consulted at `C:/Users/emeae/.codex/plugins/cache/openai-curated-remote/vercel/0.54.1/skills/deployments-cicd/SKILL.md`. Machine-readable Preview evidence is in `HOSTED-METADATA-20261112.json`.

