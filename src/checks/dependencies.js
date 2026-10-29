import semver from "semver";
import { stripPeerSuffix } from "../lockfiles/shared.js";
import { installSuggestion } from "../report.js";

/**
 * @param {Map<string, string>} declaredDependencies
 * @param {Map<string, { specifier: string, version: string }>} lockedDependencies
 * @param {{ lockfileName: string, packageManager: string }} lockfile
 * @returns {import("../report.js").Finding[]}
 */
export default function compareDependencies(
  declaredDependencies,
  lockedDependencies,
  { lockfileName, packageManager },
) {
  const syncSuggestion = installSuggestion(packageManager, lockfileName);
  const findings = [];

  for (const [name, ver] of declaredDependencies) {
    const entry = lockedDependencies.get(name);
    if (!entry) {
      findings.push({
        code: "DEPENDENCY_NOT_LOCKED",
        severity: "error",
        message: `${name} is in package.json but missing from ${lockfileName}.`,
        suggestion: syncSuggestion,
      });
      continue;
    }
    if (entry.specifier !== ver) {
      findings.push({
        code: "DEPENDENCY_SPECIFIER_MISMATCH",
        severity: "warning",
        message: `${name} is declared as ${ver} in package.json but locked as ${entry.specifier} in ${lockfileName}.`,
        suggestion: syncSuggestion,
      });
    }

    // Dist-tags, git URLs, workspace: and npm: aliases are not semver ranges,
    // and links or tarballs are not semver versions.
    const lockedVersion = semver.valid(stripPeerSuffix(entry.version ?? ""));
    if (!semver.validRange(ver) || !lockedVersion) {
      findings.push({
        code: "DEPENDENCY_NOT_CHECKED",
        severity: "info",
        message: `Unable to evaluate ${name}@${ver} (locked as ${entry.version}) because it is not a semver range. Please check it manually.`,
      });
      continue;
    }
    if (!semver.satisfies(lockedVersion, ver)) {
      findings.push({
        code: "DEPENDENCY_RANGE_UNSATISFIED",
        severity: "error",
        message: `${name} is locked at ${lockedVersion}, which does not satisfy ${ver}.`,
        suggestion: syncSuggestion,
      });
    }
  }

  for (const name of lockedDependencies.keys()) {
    if (declaredDependencies.has(name)) continue;
    findings.push({
      code: "DEPENDENCY_NOT_DECLARED",
      severity: "warning",
      message: `${name} is in ${lockfileName} but no longer declared in package.json.`,
      suggestion: syncSuggestion,
    });
  }

  if (findings.length === 0) {
    findings.push({
      code: "DEPENDENCIES_OK",
      severity: "ok",
      message: {
        0: "No dependencies are declared in package.json.",
        1: `1 dependency matches ${lockfileName}.`,
      }[declaredDependencies.size] ?? `All ${declaredDependencies.size} dependencies match ${lockfileName}.`,
    });
  }
  return findings;
}
