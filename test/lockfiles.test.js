import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import resolveActiveLockfile from "../src/lockfiles/index.js";

function projectWith(t, fileNames) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deeval-"));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  for (const fileName of fileNames) {
    fs.writeFileSync(path.join(projectRoot, fileName), "");
  }
  return projectRoot;
}

test("picks the only present lockfile", (t) => {
  const result = resolveActiveLockfile(projectWith(t, ["pnpm-lock.yaml"]));
  assert.equal(result.lockfile.lockfileName, "pnpm-lock.yaml");
  assert.equal(result.packageManager, "pnpm");
  assert.deepEqual(result.findings, []);
});

test("prefers package-lock.json and warns when several are present", (t) => {
  const result = resolveActiveLockfile(
    projectWith(t, ["pnpm-lock.yaml", "package-lock.json"]),
  );
  assert.equal(result.lockfile.lockfileName, "package-lock.json");
  assert.deepEqual(
    result.findings.map(({ code }) => code),
    ["LOCKFILE_MULTIPLE"],
  );
});

test("missing lockfile is a warning, not a crash", (t) => {
  const result = resolveActiveLockfile(projectWith(t, []));
  assert.equal(result.lockfile, undefined);
  assert.equal(result.findings[0].code, "LOCKFILE_MISSING");
});

test("lockfiles without a parser are reported as not compared", (t) => {
  const result = resolveActiveLockfile(projectWith(t, ["yarn.lock"]));
  assert.equal(result.packageManager, "yarn");
  assert.equal(result.findings[0].code, "LOCKFILE_UNSUPPORTED");
});
