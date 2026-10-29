#!/usr/bin/env node
import fs from "node:fs";
import inspect from "../src/inspect.js";
import { formatReport, exitCodeFor } from "../src/report.js";

const USAGE = `Usage: deeval [options]

Run deeval in the root directory of a Node.js or Bun project. It checks the
runtime version, package.json against the lockfile and the lockfile against
node_modules, then lists suggested actions. It never changes the project.

Options:
  -h, --help     Show this help
  -v, --version  Show the deeval version

Exit codes: 0 no errors, 1 errors found, 2 no package.json or unknown option`;

const [option] = process.argv.slice(2);

if (option === "-h" || option === "--help") {
  console.log(USAGE);
} else if (option === "-v" || option === "--version") {
  const { version } = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  );
  console.log(version);
} else if (option !== undefined) {
  console.error(`deeval: unknown option ${option}\n\n${USAGE}`);
  process.exitCode = 2;
} else {
  const result = inspect(process.cwd());
  console.log(formatReport(result));
  process.exitCode = exitCodeFor(result);
}
