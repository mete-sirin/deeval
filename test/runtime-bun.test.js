import { test } from "node:test";
import assert from "node:assert/strict";
import checkBunRuntime from "../src/runtime/bun.js";
import { versionOf } from "../src/runtime/installed.js";

const summarize = (findings) =>
  findings.map(({ code, severity }) => `${code}:${severity}`);

test("an installed Bun that satisfies engines.bun is ok", () => {
  assert.deepEqual(
    summarize(checkBunRuntime({ engines: { bun: ">=1.1" } }, "1.4.2")),
    ["BUN_VERSION_OK:ok"],
  );
});

test("an installed Bun that doesn't satisfy engines.bun is an error", () => {
  const findings = checkBunRuntime({ engines: { bun: "^1.5.0" } }, "1.4.2");
  assert.deepEqual(summarize(findings), ["BUN_VERSION_MISMATCH:error"]);
  assert.match(findings[0].suggestion, /\^1\.5\.0/);
});

test("a Bun project without engines.bun is a warning", () => {
  assert.deepEqual(summarize(checkBunRuntime({}, "1.4.2")), [
    "BUN_REQUIREMENT_MISSING:warning",
  ]);
});

test("a missing Bun binary is an error", () => {
  assert.deepEqual(summarize(checkBunRuntime({ engines: { bun: ">=1" } }, undefined)), [
    "BUN_NOT_INSTALLED:error",
  ]);
});

test("unsupported engines.bun syntax is reported, not judged", () => {
  assert.deepEqual(summarize(checkBunRuntime({ engines: { bun: "canary" } }, "1.4.2")), [
    "BUN_REQUIREMENT_UNSUPPORTED:info",
  ]);
});

test("versionOf returns undefined for a missing binary", () => {
  assert.equal(versionOf("deeval-definitely-not-a-command"), undefined);
});

test("versionOf strips the v prefix from node --version", () => {
  assert.equal(versionOf(process.execPath), process.versions.node);
});
