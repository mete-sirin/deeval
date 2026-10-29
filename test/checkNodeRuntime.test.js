import { test } from "node:test";
import assert from "node:assert/strict";
import compareNodeVersions from "../handlers/node/checkNodeRuntime.js";

function capturedOutput(t, required, installed) {
  const log = t.mock.method(console, "log", () => {});
  compareNodeVersions(required, installed);
  return log.mock.calls.map((call) => call.arguments.join(" ")).join("\n");
}

const satisfied = [
  [">=18", "18.0.0"],
  [">=18", "24.1.0"],
  [">18.0.0", "18.0.1"],
  ["<=18", "18.9.0"],
  ["<20", "19.9.9"],
  ["18.0.0", "18.0.0"],
];

const unsatisfied = [
  [">=20", "18.5.0"],
  [">18.0.0", "18.0.0"],
  ["<=18", "19.0.0"],
  ["<18", "18.5.0"],
  ["18.0.0", "18.0.1"],
];

for (const [required, installed] of satisfied) {
  test(`${installed} satisfies ${required}`, (t) => {
    assert.match(capturedOutput(t, required, installed), /fulfills/);
  });
}

for (const [required, installed] of unsatisfied) {
  test(`${installed} does not satisfy ${required}`, (t) => {
    assert.match(capturedOutput(t, required, installed), /WARNING/);
  });
}

test("unsupported range syntax is reported, not judged", (t) => {
  assert.match(capturedOutput(t, ">=18 <22", "20.0.0"), /not supported/);
});
