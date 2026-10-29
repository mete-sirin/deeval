import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

const mainPath = path.resolve(import.meta.dirname, "../main.js");

function runIn(fixtureName) {
  return spawnSync(process.execPath, [mainPath], {
    cwd: path.join(import.meta.dirname, "fixtures", fixtureName),
    encoding: "utf8",
  });
}

test("evaluates a pnpm project end to end", () => {
  const result = runIn("pnpm-basic");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Package manager: pnpm \(pnpm-lock\.yaml\)/);
  assert.match(result.stdout, /\[OK\] +Node\.js .* satisfies >=18/);
  assert.match(result.stdout, /Summary: no problems found/);
  assert.doesNotMatch(result.stdout, /Suggested actions/);
});

test("a project without dependencies does not crash", () => {
  const result = runIn("no-dependencies");
  assert.equal(result.status, 0, result.stderr);
});

test("an out-of-sync project exits 1 and suggests one install", () => {
  const result = runIn("pnpm-out-of-sync");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /\[ERROR\] zod is in package\.json but missing/);
  assert.match(result.stdout, /\[WARN\] +yaml is declared as \^3\.0\.0/);
  assert.match(result.stdout, /Summary: 2 errors, 1 warning/);
  assert.equal(result.stdout.match(/`pnpm install`/g)?.length, 1);
});

test("a project without a lockfile warns but exits 0", () => {
  const result = runIn("no-lockfile");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[WARN\] +No lockfile found/);
  assert.match(result.stdout, /1\. Run `npm install` to generate a lockfile\./);
});

test("a directory without package.json exits 2", () => {
  const result = runIn("not-javascript");
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /No package\.json found/);
});
