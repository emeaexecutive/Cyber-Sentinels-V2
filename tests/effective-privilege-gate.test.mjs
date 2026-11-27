import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Gateway privilege preflight detects column-level grants", async () => {
  const sql = await readFile(new URL("../security/qualification/effective-privilege-gate.sql", import.meta.url), "utf8");
  for (const privilege of ["SELECT", "INSERT", "UPDATE", "REFERENCES"]) {
    assert.match(sql, new RegExp(`has_any_column_privilege\\('execution20_gateway_login',\\s*c\\.oid,\\s*'${privilege}'\\)`));
  }
});
