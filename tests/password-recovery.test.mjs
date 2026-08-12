import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getApprovedAuthOrigin,
  isApprovedSameOriginRequest,
  PASSWORD_RESET_GENERIC_MESSAGE,
  validateNewPassword,
} from "../lib/auth/password-recovery.ts";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

function withEnvironment(values, callback) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  try {
    return callback();
  } finally {
    Object.entries(previous).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

test("password policy rejects weak passwords and accepts configured length", () => {
  assert.equal(validateNewPassword("short"), "Use at least 8 characters.");
  assert.equal(validateNewPassword("eight-or-more"), null);
});

test("production reset requests accept only the configured exact origin", () => {
  withEnvironment(
    {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_SITE_URL: "https://www.cybersentinels.com",
      NEXT_PUBLIC_APP_URL: undefined,
    },
    () => {
      assert.equal(
        getApprovedAuthOrigin("https://www.cybersentinels.com/api/auth/password-reset/request"),
        "https://www.cybersentinels.com",
      );
      assert.equal(getApprovedAuthOrigin("https://evil.example/api/auth/password-reset/request"), null);
      assert.equal(
        isApprovedSameOriginRequest(
          new Request("https://www.cybersentinels.com/api/auth/password-reset/request", {
            headers: { origin: "https://evil.example" },
          }),
        ),
        false,
      );
      assert.equal(
        isApprovedSameOriginRequest(
          new Request("https://www.cybersentinels.com/api/auth/password-reset/request"),
        ),
        false,
      );
    },
  );
});

test("Preview reset requests are limited to the runtime Preview origin", () => {
  withEnvironment(
    {
      VERCEL_ENV: "preview",
      VERCEL_URL: "cyber-sentinels-pr-56-keith-speres-projects.vercel.app",
      NEXT_PUBLIC_SITE_URL: "https://www.cybersentinels.com",
    },
    () => {
      assert.equal(
        getApprovedAuthOrigin(
          "https://cyber-sentinels-pr-56-keith-speres-projects.vercel.app/api/auth/password-reset/request",
        ),
        "https://cyber-sentinels-pr-56-keith-speres-projects.vercel.app",
      );
      assert.equal(
        getApprovedAuthOrigin(
          "https://attacker-keith-speres-projects.vercel.app/api/auth/password-reset/request",
        ),
        null,
      );
    },
  );
});

test("recovery implementation uses product-owned request, PKCE callback, and updateUser", async () => {
  const [login, requestRoute, callback, completeRoute, page, config, template, recoveryPolicy] = await Promise.all([
    read("app/login/page.tsx"),
    read("app/api/auth/password-reset/request/route.ts"),
    read("lib/auth/callback-handler.ts"),
    read("app/api/auth/password-reset/complete/route.ts"),
    read("app/account/reset-password/reset-password-form.tsx"),
    read("supabase/config.toml"),
    read("supabase/templates/recovery.html"),
    read("lib/auth/password-recovery.ts"),
  ]);

  assert.match(login, /\/api\/auth\/password-reset\/request/);
  assert.doesNotMatch(login, /resetPasswordForEmail/);
  assert.match(requestRoute, /supabase\.auth\.resetPasswordForEmail/);
  assert.match(requestRoute, /verifyTurnstileToken/);
  assert.match(requestRoute, /PASSWORD_RESET_EMAIL_ACCEPTED_BY_PROVIDER/);
  assert.match(recoveryPolicy, new RegExp(PASSWORD_RESET_GENERIC_MESSAGE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(callback, /event === "PASSWORD_RECOVERY"/);
  assert.match(callback, /PASSWORD_RECOVERY_CALLBACK/);
  assert.match(completeRoute, /supabase\.auth\.updateUser/);
  assert.match(completeRoute, /scope: "global"/);
  assert.match(completeRoute, /PASSWORD_UPDATED/);
  assert.match(page, /Set a new password/);
  assert.match(page, /Confirm new password/);
  assert.match(config, /site_url = "https:\/\/www\.cybersentinels\.com"/);
  assert.doesNotMatch(config, /www\.cybersentinels\.com\/\*\*/);
  assert.match(template, /\{\{ \.ConfirmationURL \}\}/);
  assert.doesNotMatch(template, /localhost|vercel\.app/i);
});

test("recovery responses do not enumerate users or expose secrets in observability", async () => {
  const [requestRoute, callback, completeRoute] = await Promise.all([
    read("app/api/auth/password-reset/request/route.ts"),
    read("lib/auth/callback-handler.ts"),
    read("app/api/auth/password-reset/complete/route.ts"),
  ]);
  const source = `${requestRoute}\n${callback}\n${completeRoute}`;

  assert.match(source, /PASSWORD_RESET_REQUESTED/);
  assert.match(source, /PASSWORD_RESET_FAILED/);
  for (const forbiddenLogField of [
    "access_token",
    "refresh_token",
    "pkce_verifier",
    "reset_token",
  ]) {
    assert.doesNotMatch(source, new RegExp(`correlation_id[^]*${forbiddenLogField}[^]*captureOperationalIssue`, "i"));
  }
  assert.doesNotMatch(requestRoute, /user.*not.*found|account.*not.*found/i);
});
