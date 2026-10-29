import { test } from "node:test";
import assert from "node:assert/strict";
import resolveActiveLockfile from "../handlers/node/resolveLockFile.js";

test("picks the only present lockfile", () => {
  const result = resolveActiveLockfile(new Set(["pnpm-lock.yaml"]));
  assert.equal(result.lockfileName, "pnpm-lock.yaml");
  assert.equal(typeof result.parseLockfile, "function");
});

test("prefers package-lock.json when several are present", (t) => {
  t.mock.method(console, "log", () => {});
  const result = resolveActiveLockfile(
    new Set(["pnpm-lock.yaml", "package-lock.json"]),
  );
  assert.equal(result.lockfileName, "package-lock.json");
});

test("throws when no lockfile is present", () => {
  assert.throws(() => resolveActiveLockfile(new Set()), /No Lockfile/);
});
