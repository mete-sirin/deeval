import fs from "node:fs";
import path from "node:path";
import checkNodeRuntime from "./runtime/node.js";
import resolveActiveLockfile from "./lockfiles/index.js";
import { DEPENDENCY_SECTIONS, UnsupportedLockfileError } from "./lockfiles/shared.js";
import compareDependencies from "./checks/dependencies.js";

/**
 * @typedef {{
 *   projectRoot: string,
 *   isJavaScriptProject: boolean,
 *   runtime?: string,
 *   packageManager?: string,
 *   lockfileName?: string,
 *   findings: import("./report.js").Finding[],
 * }} InspectionResult
 */

/** @returns {InspectionResult} */
export default function inspect(projectRoot) {
  const manifestPath = path.join(projectRoot, "package.json");
  if (!fs.existsSync(manifestPath)) {
    return { projectRoot, isJavaScriptProject: false, findings: [] };
  }

  const result = {
    projectRoot,
    isJavaScriptProject: true,
    runtime: "Node.js",
    findings: [],
  };

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    result.findings.push({
      code: "MANIFEST_INVALID",
      severity: "error",
      message: `package.json could not be parsed: ${err.message}`,
      suggestion: "Fix the syntax errors in package.json.",
    });
    return result;
  }

  result.findings.push(checkNodeRuntime(manifest));

  const { lockfile, packageManager, findings } = resolveActiveLockfile(
    projectRoot,
    manifest,
  );
  result.packageManager = packageManager;
  result.lockfileName = lockfile?.lockfileName;
  result.findings.push(...findings);
  if (!lockfile) return result;

  let lockedDependencies;
  try {
    const rawLockfileContent = fs.readFileSync(
      path.join(projectRoot, lockfile.lockfileName),
      "utf8",
    );
    lockedDependencies = lockfile.parse(rawLockfileContent, lockfile.lockfileName);
  } catch (err) {
    result.findings.push(
      err instanceof UnsupportedLockfileError
        ? {
            code: "LOCKFILE_UNSUPPORTED",
            severity: "warning",
            message: `${err.message} Dependencies were not compared.`,
            suggestion: err.suggestion,
          }
        : {
            code: "LOCKFILE_INVALID",
            severity: "error",
            message: `${lockfile.lockfileName} could not be parsed: ${err.message}`,
            suggestion: `Regenerate ${lockfile.lockfileName} with \`${lockfile.packageManager} install\`.`,
          },
    );
    return result;
  }

  const declaredDependencies = new Map(
    DEPENDENCY_SECTIONS.flatMap((section) =>
      Object.entries(manifest[section] ?? {}),
    ),
  );
  result.findings.push(
    ...compareDependencies(declaredDependencies, lockedDependencies, lockfile),
  );
  return result;
}
