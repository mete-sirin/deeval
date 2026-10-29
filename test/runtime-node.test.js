import { test } from "node:test";
import assert from "node:assert/strict";
import checkNodeRuntime from "../src/runtime/node.js";

const check = (required, installed) =>
  checkNodeRuntime({ engines: { node: required } }, installed);

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
  test(`${installed} satisfies ${required}`, () => {
    assert.equal(check(required, installed).code, "NODE_VERSION_OK");
  });
}

for (const [required, installed] of unsatisfied) {
  test(`${installed} does not satisfy ${required}`, () => {
    const finding = check(required, installed);
    assert.equal(finding.code, "NODE_VERSION_MISMATCH");
    assert.equal(finding.severity, "error");
    assert.match(finding.suggestion, new RegExp(required));
  });
}

test("unsupported range syntax is reported, not judged", () => {
  const finding = check(">=18 <22", "20.0.0");
  assert.equal(finding.code, "NODE_REQUIREMENT_UNSUPPORTED");
  assert.equal(finding.severity, "info");
});

test("missing engines.node is a warning", () => {
  const finding = checkNodeRuntime({}, "24.0.0");
  assert.equal(finding.code, "NODE_REQUIREMENT_MISSING");
  assert.equal(finding.severity, "warning");
});
