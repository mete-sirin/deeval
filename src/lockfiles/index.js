import fs from "node:fs";
import path from "node:path";
import parseNpmLockfile from "./npm.js";
import parsePnpmLockfile from "./pnpm.js";

// In priority order: when several lockfiles exist, the first one is used.
const LOCKFILES = [
  { lockfileName: "package-lock.json", packageManager: "npm", parse: parseNpmLockfile },
  { lockfileName: "pnpm-lock.yaml", packageManager: "pnpm", parse: parsePnpmLockfile },
  { lockfileName: "yarn.lock", packageManager: "yarn" },
  { lockfileName: "bun.lock", packageManager: "bun" },
  { lockfileName: "npm-shrinkwrap.json", packageManager: "npm" },
  { lockfileName: "bun.lockb", packageManager: "bun" },
];

/**
 * @returns {{
 *   lockfile: { lockfileName: string, packageManager: string, parse?: Function } | undefined,
 *   packageManager: string,
 *   findings: import("../report.js").Finding[],
 * }}
 */
export default function resolveActiveLockfile(projectRoot) {
  const presentLockfiles = LOCKFILES.filter(({ lockfileName }) =>
    fs.existsSync(path.join(projectRoot, lockfileName)),
  );
  const findings = [];

  if (presentLockfiles.length === 0) {
    findings.push({
      code: "LOCKFILE_MISSING",
      severity: "warning",
      message: "No lockfile found, so dependency versions are not pinned.",
      suggestion: "Run `npm install` to generate a lockfile.",
    });
    return { lockfile: undefined, packageManager: "npm", findings };
  }

  const [lockfile] = presentLockfiles;
  if (presentLockfiles.length > 1) {
    const names = presentLockfiles.map(({ lockfileName }) => lockfileName);
    findings.push({
      code: "LOCKFILE_MULTIPLE",
      severity: "warning",
      message: `Found more than one lockfile (${names.join(", ")}). Using ${lockfile.lockfileName}.`,
      suggestion: `Delete the lockfiles of package managers you don't use, keeping only ${lockfile.lockfileName}.`,
    });
  }
  if (!lockfile.parse) {
    findings.push({
      code: "LOCKFILE_UNSUPPORTED",
      severity: "info",
      message: `${lockfile.lockfileName} is not supported yet, so dependencies were not compared.`,
    });
  }
  return { lockfile, packageManager: lockfile.packageManager, findings };
}
