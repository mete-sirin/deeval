import fs from "node:fs";
import path from "node:path";
import semver from "semver";
import { parse } from "yaml";
import { stripPeerSuffix } from "../lockfiles/shared.js";
import { installSuggestion } from "../report.js";

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

// Yarn Berry installs with Plug'n'Play unless .yarnrc.yml sets another nodeLinker.
function yarnNodeLinker(projectRoot) {
  try {
    const yarnrc = parse(
      fs.readFileSync(path.join(projectRoot, ".yarnrc.yml"), "utf8"),
    );
    return yarnrc?.nodeLinker ?? "pnp";
  } catch {
    return "pnp";
  }
}

// Production installs skip devDependencies and platforms skip optional ones,
// so only a missing regular dependency is a confirmed problem.
const MISSING_SEVERITY = {
  dependencies: "error",
  devDependencies: "warning",
  optionalDependencies: "info",
};

/**
 * @param {string} projectRoot
 * @param {Map<string, { specifier: string, version: string }>} lockedDependencies
 * @param {Record<string, any>} manifest
 * @param {{ lockfileName: string, packageManager: string }} lockfile
 * @returns {import("../report.js").Finding[]}
 */
export default function checkInstalledDependencies(
  projectRoot,
  lockedDependencies,
  manifest,
  { lockfileName, packageManager },
) {
  // Optional wins when a package is listed twice, as it does for npm. Stale
  // lockfile entries have no section and are already reported by compareDependencies.
  const dependenciesToCheck = [...lockedDependencies]
    .map(([name, { version }]) => ({
      name,
      version,
      section: ["optionalDependencies", "devDependencies", "dependencies"].find(
        (section) => manifest[section]?.[name] !== undefined,
      ),
    }))
    .filter(({ section }) => section);
  // Nothing to install, so a missing node_modules is expected.
  if (dependenciesToCheck.length === 0) return [];

  if (packageManager === "yarn" && yarnNodeLinker(projectRoot) === "pnp") {
    return [
      {
        code: "INSTALL_NOT_CHECKED",
        severity: "info",
        message:
          "Yarn Plug'n'Play has no node_modules directory, so installed packages were not checked.",
      },
    ];
  }

  const syncSuggestion = installSuggestion(packageManager, lockfileName);
  const nodeModulesPath = path.join(projectRoot, "node_modules");
  if (!fs.existsSync(nodeModulesPath)) {
    return [
      {
        code: "DEPENDENCIES_NOT_INSTALLED",
        severity: "warning",
        message: "No node_modules directory, so dependencies are not installed.",
        suggestion: syncSuggestion,
      },
    ];
  }

  const findings = [];
  for (const { name, version, section } of dependenciesToCheck) {
    // fs follows symlinks, so pnpm's and bun's isolated layouts resolve here too.
    const installedManifest = readJsonFile(
      path.join(nodeModulesPath, name, "package.json"),
    );
    if (!installedManifest) {
      findings.push({
        code: "DEPENDENCY_NOT_INSTALLED",
        severity: MISSING_SEVERITY[section],
        message: `${name} (${section}) is in ${lockfileName} but not installed in node_modules.`,
        suggestion: section === "optionalDependencies" ? undefined : syncSuggestion,
      });
      continue;
    }

    const lockedVersion = semver.valid(stripPeerSuffix(version ?? ""));
    if (lockedVersion && installedManifest.version !== lockedVersion) {
      findings.push({
        code: "DEPENDENCY_INSTALL_OUT_OF_SYNC",
        severity: "warning",
        message: `${name} ${installedManifest.version} is installed, but ${lockfileName} locks ${lockedVersion}.`,
        suggestion: syncSuggestion,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      code: "INSTALLED_OK",
      severity: "ok",
      message:
        dependenciesToCheck.length === 1
          ? "1 dependency is installed at its locked version."
          : `All ${dependenciesToCheck.length} dependencies are installed at their locked versions.`,
    });
  }
  return findings;
}
