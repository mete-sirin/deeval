import fs from "node:fs";
import path from "node:path";
import parseNpmLockfile from "./npm.js";
import parsePnpmLockfile from "./pnpm.js";
import parseYarnLockfile from "./yarn.js";
import parseBunLockfile, { parseBunBinaryLockfile } from "./bun.js";

// In priority order: when several lockfiles exist and package.json doesn't
// declare a packageManager, the first one is used.
const LOCKFILES = [
  { lockfileName: "npm-shrinkwrap.json", packageManager: "npm", parse: parseNpmLockfile },
  { lockfileName: "package-lock.json", packageManager: "npm", parse: parseNpmLockfile },
  { lockfileName: "pnpm-lock.yaml", packageManager: "pnpm", parse: parsePnpmLockfile },
  { lockfileName: "yarn.lock", packageManager: "yarn", parse: parseYarnLockfile },
  { lockfileName: "bun.lock", packageManager: "bun", parse: parseBunLockfile },
  { lockfileName: "bun.lockb", packageManager: "bun", parse: parseBunBinaryLockfile },
];

const PACKAGE_MANAGERS = new Set(LOCKFILES.map(({ packageManager }) => packageManager));

// "pnpm@9.1.0+sha512.abc" → "pnpm"
function declaredPackageManagerOf(manifest) {
  const name = manifest?.packageManager?.split("@")[0];
  return PACKAGE_MANAGERS.has(name) ? name : undefined;
}

/**
 * @returns {{
 *   lockfile: { lockfileName: string, packageManager: string, parse: Function } | undefined,
 *   packageManager: string,
 *   findings: import("../report.js").Finding[],
 * }}
 */
export default function resolveActiveLockfile(projectRoot, manifest) {
  const declaredPackageManager = declaredPackageManagerOf(manifest);
  const presentLockfiles = LOCKFILES.filter(({ lockfileName }) =>
    fs.existsSync(path.join(projectRoot, lockfileName)),
  );
  const findings = [];

  if (presentLockfiles.length === 0) {
    const packageManager = declaredPackageManager ?? "npm";
    findings.push({
      code: "LOCKFILE_MISSING",
      severity: "warning",
      message: "No lockfile found, so dependency versions are not pinned.",
      suggestion: `Run \`${packageManager} install\` to generate a lockfile.`,
    });
    return { lockfile: undefined, packageManager, findings };
  }

  const lockfile =
    presentLockfiles.find(
      ({ packageManager }) => packageManager === declaredPackageManager,
    ) ?? presentLockfiles[0];

  if (declaredPackageManager && lockfile.packageManager !== declaredPackageManager) {
    findings.push({
      code: "LOCKFILE_PACKAGE_MANAGER_MISMATCH",
      severity: "warning",
      message: `package.json declares ${declaredPackageManager} as its packageManager, but the lockfile is ${lockfile.lockfileName} (${lockfile.packageManager}).`,
      suggestion: `Run \`${declaredPackageManager} install\` to create a ${declaredPackageManager} lockfile, then delete ${lockfile.lockfileName}.`,
    });
  }
  if (presentLockfiles.length > 1) {
    const names = presentLockfiles.map(({ lockfileName }) => lockfileName);
    findings.push({
      code: "LOCKFILE_MULTIPLE",
      severity: "warning",
      message: `Found more than one lockfile (${names.join(", ")}). Using ${lockfile.lockfileName}.`,
      suggestion: `Delete the lockfiles of package managers you don't use, keeping only ${lockfile.lockfileName}.`,
    });
  }
  return {
    lockfile,
    packageManager: declaredPackageManager ?? lockfile.packageManager,
    findings,
  };
}
