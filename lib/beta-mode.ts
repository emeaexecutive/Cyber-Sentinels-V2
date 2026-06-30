import "server-only";

export const BETA_MODE =
  String(process.env.BETA_MODE ?? "true").toLowerCase() !== "false";

export const betaNoticeText =
  "This workflow is in controlled preview while operational feedback and design-partner validation continue.";
