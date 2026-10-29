import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import checkNodeRuntime, { readNodeRequirements } from "../src/runtime/node.js";

const check = (required, installed, source = "engines.node") =>
  checkNodeRuntime([{ source, range: required }], installed);

const satisfied = [
  [">=18", "18.0.0"],
  [">=18", "24.1.0"],
  [">18.0.0", "18.0.1"],
  ["<=18", "18.9.0"],
  ["<20", "19.9.9"],
  ["18.0.0", "18.0.0"],
  [">=18 <22", "20.0.0"],
  ["^20 || ^22", "22.3.0"],
  ["20.x", "20.11.1"],
  ["~20.10", "20.10.5"],
];

const unsatisfied = [
  [">=18 <22", "22.0.0"],
  ["^20 || ^22", "21.0.0"],
  ["~20.10", "20.11.0"],
  [">=20", "18.5.0"],
  [">18.0.0", "18.0.0"],
  ["<=18", "19.0.0"],
  ["<18", "18.5.0"],
  ["18.0.0", "18.0.1"],
];

for (const [required, installed] of satisfied) {
  test(`${installed} satisfies ${required}`, () => {
    assert.equal(check(required, installed)[0].code, "NODE_VERSION_OK");
  });
}

for (const [required, installed] of unsatisfied) {
  test(`${installed} does not satisfy ${required}`, () => {
    const [finding] = check(required, installed);
    assert.equal(finding.code, "NODE_VERSION_MISMATCH");
    assert.equal(finding.severity, "error");
    assert.match(finding.suggestion, new RegExp(required));
  });
}

test("a version file mismatch is a warning with a switch suggestion", () => {
  const [finding] = check("20", "24.1.0", ".nvmrc");
  assert.equal(finding.code, "NODE_VERSION_FILE_MISMATCH");
  assert.equal(finding.severity, "warning");
  assert.match(finding.suggestion, /`nvm use`/);
});

test("aliases like lts/* are reported, not judged", () => {
  const [finding] = check("lts/*", "20.0.0", ".nvmrc");
  assert.equal(finding.code, "NODE_REQUIREMENT_UNSUPPORTED");
  assert.equal(finding.severity, "info");
});

test("every declared requirement is checked", () => {
  const findings = checkNodeRuntime(
    [
      { source: "engines.node", range: ">=18" },
      { source: ".nvmrc", range: "v22.1.0" },
      { source: ".node-version", range: "22" },
    ],
    "22.1.0",
  );
  assert.deepEqual(
    findings.map(({ code }) => code),
    ["NODE_VERSION_OK", "NODE_VERSION_OK", "NODE_VERSION_OK"],
  );
});

test("no requirement at all is a warning", () => {
  const [finding] = checkNodeRuntime([], "24.0.0");
  assert.equal(finding.code, "NODE_REQUIREMENT_MISSING");
  assert.equal(finding.severity, "warning");
});

test("a missing Node.js binary is an error", () => {
  const [finding] = checkNodeRuntime([{ source: "engines.node", range: ">=18" }], undefined);
  assert.equal(finding.code, "NODE_NOT_INSTALLED");
  assert.equal(finding.severity, "error");
});

test("requirements are read from engines, .nvmrc and .node-version", (t) => {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "deeval-"));
  t.after(() => fs.rmSync(projectRoot, { recursive: true, force: true }));
  fs.writeFileSync(path.join(projectRoot, ".nvmrc"), "# pinned for CI\n\nv20.11.1\n");
  fs.writeFileSync(path.join(projectRoot, ".node-version"), "20\n");
  assert.deepEqual(readNodeRequirements(projectRoot, { engines: { node: ">=18" } }), [
    { source: "engines.node", range: ">=18" },
    { source: ".nvmrc", range: "v20.11.1" },
    { source: ".node-version", range: "20" },
  ]);
});
