# Proposed KYA integration PR

Status: prepared locally; no remote PR created because pushing is on HOLD.

Base: `codex/integrated-website-20261112` at `9b58683a63ce71b7f6d48936dfd71f90f52b15c3` (PR #143).
Head: `feat/kya-homepage-20261116`.
Title: `feat(website): integrate bilingual KYA homepage, landing page and approved original diagram`

The website needs a public introduction to the developing KYA identity and delegated-authority capability. This change adds the approved EN/ES homepage narrative and dedicated KYA landing pages, locale-correct navigation, metadata and pilot-enquiry destinations. The supplied original English diagram is delivered through Next Image without changing the PNG bytes. A full-size link supports mobile zoom; the translated accessible text flow remains visible in both locales.

This is stacked on the existing website candidate. PR #143's documentation, PR #141's River Crossing simulations and the inherited translation work are already ancestors; they are not reimported or replaced. Original checkpoint `2e2c44d1850b6287762842c81a7554885047e3fc` is preserved in history. No database, financial enforcement, treasury or Production qualification is included.

Validation and limitations: see REPORT.md and PNG-INTEGRATION.md for exact source, local checks, screenshot evidence and outstanding release gates. Remote CI on this unpublished feature head has not run. PR #143's redacted-secret-scan run 43479377809 is failed; its green rendering/build checks do not erase that release blocker. No merge, PR closure or deployment is authorized.
