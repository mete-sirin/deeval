import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import checkInstalledDependencies from "../src/checks/installed.js";

const npmLockfile = { lockfileName: "package-lock.json", packageManager: "npm" };
const yarnLockfile = { lockfileName: "yarn.lock", packageManager: "yarn" };

const manifest = {
  dependencies: { ms: "^2.1.3" },
  devDependencies: { kleur: "^4.1.5" },
  optionalDependencies: { picocolors: "^1.1.1" },
};

const lockedDependencies = new Map([
  ["ms", { specifier: "^2.1.3", version: "2.1.3" }],
  ["kleur", { specifier: "^4.1.5", version: "4.1.5" }],
  ["picocolors", { specifier: "^1.1.1", version: "1.1.1" }],
]);

// installed: { name: version }; null creates the project without node_modules.
function projectWith(t, installed, files = {}) {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deeval-"));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  if (installed) {
    for (const [name, version] of Object.entries(installed)) {
      const packageDir = path.join(projectRoot, "node_modules", name);
      fs.mkdirSync(packageDir, { recursive: true });
      fs.writeFileSync(
        path.join(packageDir, "package.json"),
        JSON.stringify({ name, version }),
      );
    }
    fs.mkdirSync(path.join(projectRoot, "node_modules"), { recursive: true });
  }
  for (const [fileName, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(projectRoot, fileName), content);
  }
  return projectRoot;
}

const check = (projectRoot, locked = lockedDependencies, lockfile = npmLockfile) =>
  checkInstalledDependencies(projectRoot, locked, manifest, lockfile);

const summarize = (findings) =>
  findings.map(({ code, severity }) => `${code}:${severity}`);

test("everything installed at the locked versions is ok", (t) => {
  const projectRoot = projectWith(t, {
    ms: "2.1.3",
    kleur: "4.1.5",
    picocolors: "1.1.1",
  });
  assert.deepEqual(summarize(check(projectRoot)), ["INSTALLED_OK:ok"]);
});

test("no node_modules is a single warning", (t) => {
  const findings = check(projectWith(t, null));
  assert.deepEqual(summarize(findings), ["DEPENDENCIES_NOT_INSTALLED:warning"]);
  assert.match(findings[0].suggestion, /`npm install`/);
});

test("missing packages are graded by section", (t) => {
  const findings = check(projectWith(t, {}));
  assert.deepEqual(summarize(findings), [
    "DEPENDENCY_NOT_INSTALLED:error",
    "DEPENDENCY_NOT_INSTALLED:warning",
    "DEPENDENCY_NOT_INSTALLED:info",
  ]);
  assert.equal(findings[2].suggestion, undefined);
});

test("an installed version that differs from the lockfile is a warning", (t) => {
  const projectRoot = projectWith(t, {
    ms: "2.1.2",
    kleur: "4.1.5",
    picocolors: "1.1.1",
  });
  const findings = check(projectRoot);
  assert.deepEqual(summarize(findings), ["DEPENDENCY_INSTALL_OUT_OF_SYNC:warning"]);
  assert.match(findings[0].message, /ms 2\.1\.2 is installed, but package-lock\.json locks 2\.1\.3/);
});

test("pnpm peer suffixes are ignored when comparing installed versions", (t) => {
  const projectRoot = projectWith(t, { ms: "2.1.3", kleur: "4.1.5", picocolors: "1.1.1" });
  const locked = new Map(lockedDependencies);
  locked.set("ms", { specifier: "^2.1.3", version: "2.1.3(react@18.0.0)" });
  assert.deepEqual(summarize(check(projectRoot, locked)), ["INSTALLED_OK:ok"]);
});

test("symlinked packages (pnpm and bun isolated layouts) are followed", (t) => {
  const projectRoot = projectWith(t, {
    ".pnpm/ms@2.1.3/node_modules/ms": "2.1.3",
    kleur: "4.1.5",
    picocolors: "1.1.1",
  });
  fs.symlinkSync(
    ".pnpm/ms@2.1.3/node_modules/ms",
    path.join(projectRoot, "node_modules", "ms"),
  );
  assert.deepEqual(summarize(check(projectRoot)), ["INSTALLED_OK:ok"]);
});

test("stale lockfile entries are not checked", (t) => {
  const projectRoot = projectWith(t, { ms: "2.1.3", kleur: "4.1.5", picocolors: "1.1.1" });
  const locked = new Map(lockedDependencies);
  locked.set("left-over", { specifier: "^1.0.0", version: "1.0.0" });
  assert.deepEqual(summarize(check(projectRoot, locked)), ["INSTALLED_OK:ok"]);
});

test("yarn Plug'n'Play (the default) is reported as not checked", (t) => {
  const findings = check(projectWith(t, null), lockedDependencies, yarnLockfile);
  assert.deepEqual(summarize(findings), ["INSTALL_NOT_CHECKED:info"]);
});

test("yarn with nodeLinker: node-modules is checked like npm", (t) => {
  const projectRoot = projectWith(t, null, {
    ".yarnrc.yml": "nodeLinker: node-modules\n",
  });
  const findings = check(projectRoot, lockedDependencies, yarnLockfile);
  assert.deepEqual(summarize(findings), ["DEPENDENCIES_NOT_INSTALLED:warning"]);
  assert.match(findings[0].suggestion, /`yarn install`/);
});
