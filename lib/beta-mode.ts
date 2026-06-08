import "server-only";

export const BETA_MODE =
  String(process.env.BETA_MODE ?? "true").toLowerCase() !== "false";

export const betaNoticeText =
  "Cyber Sentinels is currently in private beta and evolving through operational feedback and design-partner collaboration.";
