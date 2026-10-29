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
  assert.match(result.stdout, /Detected runtime: Node\.js/);
  assert.match(result.stdout, /fulfills the required version/);
});

test("a project without dependencies does not crash", () => {
  const result = runIn("no-dependencies");
  assert.equal(result.status, 0, result.stderr);
});
