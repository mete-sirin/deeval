import semver from "semver";

/**
 * @param {Record<string, any>} manifest
 * @param {string | undefined} installedVersionString
 * @returns {import("../report.js").Finding[]}
 */
export default function checkBunRuntime(manifest, installedVersionString) {
  if (!installedVersionString) {
    return [
      {
        code: "BUN_NOT_INSTALLED",
        severity: "error",
        message: "This is a Bun project, but Bun is not installed or not on PATH.",
        suggestion: "Install Bun from https://bun.sh.",
      },
    ];
  }

  const range = manifest?.engines?.bun;
  if (!range) {
    return [
      {
        code: "BUN_REQUIREMENT_MISSING",
        severity: "warning",
        message: "No Bun version requirement (engines.bun) in package.json.",
        suggestion:
          "Add an engines.bun field to package.json so the required Bun version is explicit.",
      },
    ];
  }
  if (!semver.validRange(range)) {
    return [
      {
        code: "BUN_REQUIREMENT_UNSUPPORTED",
        severity: "info",
        message: `Unable to evaluate the Bun requirement ${range} because its syntax is not supported. Please check manually that Bun ${installedVersionString} satisfies it.`,
      },
    ];
  }
  if (semver.satisfies(installedVersionString, range)) {
    return [
      {
        code: "BUN_VERSION_OK",
        severity: "ok",
        message: `Bun ${installedVersionString} satisfies ${range} (engines.bun).`,
      },
    ];
  }
  return [
    {
      code: "BUN_VERSION_MISMATCH",
      severity: "error",
      message: `Bun ${installedVersionString} does not satisfy ${range} required by engines.bun.`,
      suggestion: `Switch to a Bun version that satisfies ${range}.`,
    },
  ];
}
