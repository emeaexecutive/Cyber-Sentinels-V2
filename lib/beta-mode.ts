import "server-only";

export const BETA_MODE =
  String(process.env.BETA_MODE ?? "true").toLowerCase() !== "false";

export const betaNoticeText =
  "Cyber Sentinels is currently in private beta, evolving through enterprise testing, operational feedback and design-partner collaboration.";
