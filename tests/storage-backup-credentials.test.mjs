import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { storageReadCredential } from "../tools/release/storage-backup-credentials.mjs";

test("Storage endpoint is validated before reading file credentials", () => {
  assert.throws(
    () => storageReadCredential({
      credentialFile: join(tmpdir(), "missing-storage-credential"),
      useExistingCliSession: false,
      url: "https://unrelated.example/storage/v1",
    }, "agpyhygpfmppjkxwcpac"),
    /exact project Storage endpoint/,
  );
});
