const VERSION_SPECIFIER_REGEX = /^([^\d\s]+)?\s*(\d+(?:\.\d+){0,2})$/;

const COMPARING_RULES = {
  "^": (declaredVersion, lockedVersion) => {
    let doesSatisfy = true;

    for (let i = 0; i < 3; i++) {
      const declared = declaredVersion[i] ?? 0;
      const locked = lockedVersion[i] ?? 0;
      if (locked < declared) {
        doesSatisfy = false;
        break;
      }
      if (locked > declared) break;
    }
    let upperVersionLimit;
    for (let i = 0; i < 3; i++) {
      if (declaredVersion[i] === 0) continue;
      upperVersionLimit = [0, 0, 0];
      upperVersionLimit[i] = declaredVersion[i] + 1;
      break;
    }

    let counter = 0;
    for (let i = 0; i < 3; i++) {
      const upper = upperVersionLimit?.[i] ?? 0;
      const locked = lockedVersion[i] ?? 0;
      if (locked > upper) {
        doesSatisfy = false;
        break;
      }
      if (locked === upper) counter++;
      if (locked < upper || counter === 3) break;
    }
    if (counter === 3) doesSatisfy = false; // upper limit is exclusive
    return doesSatisfy;
  },
};

const toParts = (versionString) =>
  versionString
    .trim()
    .split(".")
    .map((text) => Number(text));

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
  const syncSuggestion = `Run \`${packageManager} install\` to bring ${lockfileName} in sync with package.json.`;
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

    const declaredDependenciesVersion = ver.trim().match(VERSION_SPECIFIER_REGEX);
    const operator = declaredDependenciesVersion?.[1];
    const doesSatisfy = COMPARING_RULES[operator];
    if (!doesSatisfy) {
      findings.push({
        code: "DEPENDENCY_NOT_CHECKED",
        severity: "info",
        message: `Unable to evaluate the version specifier ${ver} of ${name} because its syntax is not supported. Please check it manually.`,
      });
      continue;
    }
    if (!doesSatisfy(toParts(declaredDependenciesVersion[2]), toParts(entry.version))) {
      findings.push({
        code: "DEPENDENCY_RANGE_UNSATISFIED",
        severity: "error",
        message: `${name} is locked at ${entry.version}, which does not satisfy ${ver}.`,
        suggestion: syncSuggestion,
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      code: "DEPENDENCIES_OK",
      severity: "ok",
      message: `All ${declaredDependencies.size} dependencies match ${lockfileName}.`,
    });
  }
  return findings;
}
