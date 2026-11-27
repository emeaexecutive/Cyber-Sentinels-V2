import assert from "node:assert/strict";
import test from "node:test";
import { writeAuthCookieChunks } from "../lib/supabase/auth-cookie-chunks.ts";

test("replacing a chunked Auth session clears chunks absent from the replacement", () => {
  const jar = new Map([
    ["sb-fixture-auth-token.0", "old-0"],
    ["sb-fixture-auth-token.1", "old-1"],
    ["sb-fixture-auth-token.2", "old-2"],
    ["unrelated", "keep"],
  ]);
  const writes = [];
  const cookieJar = {
    getAll: () => [...jar.keys()].map((name) => ({ name })),
    set(name, value, options) {
      writes.push({ name, value, options });
      if (options?.maxAge === 0 || value === "") jar.delete(name);
      else jar.set(name, value);
    },
  };
  const options = { path: "/", sameSite: "lax", maxAge: 3600 };

  writeAuthCookieChunks(cookieJar, [
    { name: "sb-fixture-auth-token.0", value: "new-0", options },
    { name: "sb-fixture-auth-token.1", value: "new-1", options },
  ]);

  assert.equal(jar.get("sb-fixture-auth-token.0"), "new-0");
  assert.equal(jar.get("sb-fixture-auth-token.1"), "new-1");
  assert.equal(jar.has("sb-fixture-auth-token.2"), false);
  assert.equal(jar.get("unrelated"), "keep");
  assert.ok(writes.some(({ name, value, options: writeOptions }) =>
    name === "sb-fixture-auth-token.2" && value === "" && writeOptions.path === "/" && writeOptions.maxAge === 0));
});

test("a single-cookie replacement also removes old chunks", () => {
  const jar = new Map([
    ["sb-fixture-auth-token.0", "old-0"],
    ["sb-fixture-auth-token.1", "old-1"],
  ]);
  const cookieJar = {
    getAll: () => [...jar.keys()].map((name) => ({ name })),
    set(name, value, options) {
      if (options?.maxAge === 0 || value === "") jar.delete(name);
      else jar.set(name, value);
    },
  };

  writeAuthCookieChunks(cookieJar, [
    { name: "sb-fixture-auth-token", value: "replacement", options: { path: "/", maxAge: 3600 } },
  ]);

  assert.deepEqual([...jar], [["sb-fixture-auth-token", "replacement"]]);
});
