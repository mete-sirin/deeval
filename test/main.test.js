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
  assert.match(result.stdout, /Summary: 2 errors, 2 warnings/);
  assert.equal(result.stdout.match(/`pnpm install`/g)?.length, 1);
});

test("a project without a lockfile warns but exits 0", () => {
  const result = runIn("no-lockfile");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[WARN\] +No lockfile found/);
  assert.match(result.stdout, /1\. Run `npm install` to generate a lockfile\./);
});

const basicProjects = [
  ["npm-basic", "npm", "package-lock.json"],
  ["pnpm8-basic", "pnpm", "pnpm-lock.yaml"],
  ["yarn-basic", "yarn", "yarn.lock"],
  ["bun-basic", "bun", "bun.lock"],
];

for (const [fixtureName, packageManager, lockfileName] of basicProjects) {
  test(`${packageManager} project with dev and optional dependencies passes`, () => {
    const result = runIn(fixtureName);
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      new RegExp(`Package manager: ${packageManager} \\(${lockfileName}\\)`),
    );
    assert.match(result.stdout, new RegExp(`All 3 dependencies match ${lockfileName}`));
  });
}

/** @type {[string, RegExp, RegExp][]} */
const unsupportedProjects = [
  ["yarn-classic", /Yarn classic \(v1\)/, /yarn set version stable/],
  ["bun-binary", /binary lockfile/, /bun install --save-text-lockfile/],
  ["npm-v1", /lockfileVersion 1/, /npm 7 or newer/],
];

for (const [fixtureName, message, suggestion] of unsupportedProjects) {
  test(`${fixtureName} is reported as unsupported, not crashed on`, () => {
    const result = runIn(fixtureName);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, message);
    assert.match(result.stdout, /Dependencies were not compared/);
    assert.match(result.stdout, suggestion);
  });
}

test("an installed npm project passes the install check", () => {
  const result = runIn("npm-installed");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[OK\] +All 3 dependencies are installed at their locked versions/);
  assert.match(result.stdout, /Summary: no problems found/);
});

test("pnpm's symlinked node_modules layout is followed", () => {
  const result = runIn("pnpm-basic");
  assert.match(result.stdout, /\[OK\] +All 1 dependencies are installed/);
});

test("an uninstalled project warns and suggests installing", () => {
  const result = runIn("bun-basic");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[WARN\] +No node_modules directory/);
  assert.match(result.stdout, /Run `bun install` to sync bun\.lock and node_modules/);
});

test("yarn Plug'n'Play projects skip the install check", () => {
  const result = runIn("yarn-basic");
  assert.match(result.stdout, /\[INFO\] +Yarn Plug'n'Play has no node_modules/);
});

test("a lockfile entry no longer in package.json is a warning", () => {
  const result = runIn("npm-stale");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[WARN\] +picocolors is in package-lock\.json but no longer declared/);
});

test("a lockfile that doesn't match packageManager is a warning", () => {
  const result = runIn("package-manager-mismatch");
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /declares pnpm as its packageManager/);
  assert.match(result.stdout, /Run `pnpm install` to create a pnpm lockfile/);
});

test("a directory without package.json exits 2", () => {
  const result = runIn("not-javascript");
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stdout, /No package\.json found/);
});
