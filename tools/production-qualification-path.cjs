/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

function buildQualificationPlan(options = {}) {
  const hopaeConfigured = Boolean(options.hopaeConfigured);
  const hopaeAccessPending = Boolean(options.hopaeAccessPending);
  const sequence = [
    "CONFIGURE ENV",
    "REDEPLOY",
    "PROVIDER HEALTH",
    "REAL VERIFICATION",
    "CALLBACK",
    "NORMALIZATION",
    "EVIDENCE",
    "TRANSACTION",
    "RECEIPT",
    "REPLAY",
    "TRUST MEMORY",
    "CUSTOMER ZERO",
    "FINAL V1 VERDICT",
  ];

  return {
    hopaeStatus: hopaeAccessPending ? "WAITING ON PROVIDER ACCESS" : hopaeConfigured ? "READY" : "NOT CONFIGURED",
    workflowStatus: hopaeAccessPending ? "PARTIAL" : "COMPLETE",
    sequence,
    ownerInputs: [
      "provider credentials",
      "approved provider environment",
      "callback endpoint registration",
      "final customer-zero approval",
    ],
  };
}

function classifyAlternativeProviders() {
  const evidenceFiles = [
    path.join(__dirname, "..", "docs", "implementation", "EPIC-17.1A-PROVIDER-TRUTH.md"),
    path.join(__dirname, "..", "docs", "implementation", "EPIC-17.2-IMPLEMENTATION-REPORT.md"),
    path.join(__dirname, "..", "docs", "PROVIDER_READINESS_MATRIX.md"),
  ];

  const summaries = evidenceFiles.map((file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "");
  const hasStripeEvidence = summaries.some((text) => /Stripe Identity/i.test(text));
  const hasWorldEvidence = summaries.some((text) => /World ID/i.test(text));

  return {
    stripeIdentity: {
      status: hasStripeEvidence ? "PARTIAL" : "UNKNOWN",
      note: "Repository support exists as registry/placeholder scaffolding, but no decision-eligible production verification path is implemented.",
    },
    worldId: {
      status: hasWorldEvidence ? "PARTIAL" : "UNKNOWN",
      note: "IMPLEMENTED / STAGING DATABASE QUALIFIED / READY FOR REAL HUMAN PROVIDER QUALIFICATION / NOT PRODUCTION EXERCISED. Provider verification does not itself authorize an action.",
    },
    bestFallback: "WORLD ID",
  };
}

module.exports = { buildQualificationPlan, classifyAlternativeProviders };
