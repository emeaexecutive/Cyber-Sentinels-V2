import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("pricing surface keeps the route while replacing public prices with consultation language", async () => {
  const [pricingSource, waitlistSource] = await Promise.all([
    read("app/pricing/page.tsx"),
    read("app/pro-waitlist/page.tsx"),
  ]);

  assert.match(pricingSource, /By consultation|Design-partner access|Pilot access|Tailored to your environment/);
  assert.doesNotMatch(pricingSource, /create-checkout-session|\$|£|€|USD|GBP|EUR|\/month|\/year|per user|per seat|per verification/);
  assert.match(pricingSource, /\/enterprise-access/);
  assert.doesNotMatch(waitlistSource, /EUR 9\.99\/month|EUR 29\.99\/month|EUR 39\.99\/month|Prices shown in EUR/);
  assert.match(waitlistSource, /Commercial terms|consultation|pilot/i);
});
