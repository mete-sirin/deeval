import { test } from "node:test";
import assert from "node:assert/strict";
import compareDependencies from "../handlers/node/compareDependencies.js";

function capturedOutput(t, specifier, lockedVersion) {
  const log = t.mock.method(console, "log", () => {});
  compareDependencies(
    new Map([["pkg", specifier]]),
    new Map([["pkg", { specifier, version: lockedVersion }]]),
  );
  return log.mock.calls.map((call) => call.arguments.join(" ")).join("\n");
}

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
  test(`${locked} satisfies ${specifier}`, (t) => {
    assert.match(capturedOutput(t, specifier, locked), /passes/);
  });
}

for (const [specifier, locked] of caretUnsatisfied) {
  test(`${locked} does not satisfy ${specifier}`, (t) => {
    assert.match(capturedOutput(t, specifier, locked), /fails/);
  });
}

test("dependency missing from the lockfile is reported", (t) => {
  const log = t.mock.method(console, "log", () => {});
  compareDependencies(new Map([["pkg", "^1.0.0"]]), new Map());
  assert.match(log.mock.calls[0].arguments[0], /missing from the lockfile/);
});

test("non-numeric specifiers do not crash", (t) => {
  t.mock.method(console, "log", () => {});
  for (const specifier of ["latest", "workspace:*", "github:user/repo"]) {
    assert.doesNotThrow(() =>
      compareDependencies(
        new Map([["pkg", specifier]]),
        new Map([["pkg", { specifier, version: "1.0.0" }]]),
      ),
    );
  }
});
