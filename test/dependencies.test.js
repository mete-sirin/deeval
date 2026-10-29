import { test } from "node:test";
import assert from "node:assert/strict";
import compareDependencies from "../src/checks/dependencies.js";

const lockfile = { lockfileName: "pnpm-lock.yaml", packageManager: "pnpm" };

function compareOne(specifier, lockedVersion) {
  return compareDependencies(
    new Map([["pkg", specifier]]),
    new Map([["pkg", { specifier, version: lockedVersion }]]),
    lockfile,
  );
}

const codes = (findings) => findings.map(({ code }) => code);

const caretSatisfied = [
  ["^1.2.3", "1.2.3"],
  ["^1.2.3", "1.9.0"],
  ["^0.2.3", "0.2.9"],
  ["^0.0.3", "0.0.3"],
];

const caretUnsatisfied = [
  ["^1.2.3", "1.2.2"],
  ["^1.2.3", "2.0.0"],
  ["^0.2.3", "0.3.0"],
  ["^0.0.3", "0.0.4"],
];

for (const [specifier, locked] of caretSatisfied) {
  test(`${locked} satisfies ${specifier}`, () => {
    assert.deepEqual(codes(compareOne(specifier, locked)), ["DEPENDENCIES_OK"]);
  });
}

for (const [specifier, locked] of caretUnsatisfied) {
  test(`${locked} does not satisfy ${specifier}`, () => {
    assert.deepEqual(codes(compareOne(specifier, locked)), [
      "DEPENDENCY_RANGE_UNSATISFIED",
    ]);
  });
}

test("dependency missing from the lockfile is an error with a sync suggestion", () => {
  const [finding] = compareDependencies(
    new Map([["pkg", "^1.0.0"]]),
    new Map(),
    lockfile,
  );
  assert.equal(finding.code, "DEPENDENCY_NOT_LOCKED");
  assert.equal(finding.severity, "error");
  assert.match(finding.suggestion, /`pnpm install`/);
});

test("specifier mismatch between manifest and lockfile is a warning", () => {
  const findings = compareDependencies(
    new Map([["pkg", "^1.2.0"]]),
    new Map([["pkg", { specifier: "^1.0.0", version: "1.2.5" }]]),
    lockfile,
  );
  assert.deepEqual(codes(findings), ["DEPENDENCY_SPECIFIER_MISMATCH"]);
});

test("non-numeric specifiers are reported as not checked", () => {
  for (const specifier of ["latest", "workspace:*", "github:user/repo"]) {
    assert.deepEqual(codes(compareOne(specifier, "1.0.0")), [
      "DEPENDENCY_NOT_CHECKED",
    ]);
  }
});
