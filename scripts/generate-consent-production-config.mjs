import { randomBytes } from "node:crypto";

function generateSecret() {
  return randomBytes(32).toString("hex");
}

const secret = generateSecret();

if (secret.length < 64) {
  console.error("Failed to generate a strong CONSENT_COOKIE_SECRET.");
  process.exit(1);
}

console.log("CONSENT_COOKIE_SECRET=" + secret);
console.log("Secret generated for operator use. Do not commit this value.");
