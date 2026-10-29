import semver from "semver";

/** @returns {import("../report.js").Finding} */
export default function checkNodeRuntime(
  manifest,
  installedVersionString = process.versions.node,
) {
  const requiredVersionString = manifest?.engines?.node;
  if (!requiredVersionString) {
    return {
      code: "NODE_REQUIREMENT_MISSING",
      severity: "warning",
      message: "No Node.js version requirement (engines.node) in package.json.",
      suggestion:
        "Add an engines.node field to package.json so the required Node.js version is explicit.",
    };
  }

  if (!semver.validRange(requiredVersionString)) {
    return {
      code: "NODE_REQUIREMENT_UNSUPPORTED",
      severity: "info",
      message: `Unable to evaluate the Node.js requirement ${requiredVersionString} because its syntax is not supported. Please check manually that Node.js ${installedVersionString} satisfies it.`,
    };
  }

  if (semver.satisfies(installedVersionString, requiredVersionString)) {
    return {
      code: "NODE_VERSION_OK",
      severity: "ok",
      message: `Node.js ${installedVersionString} satisfies ${requiredVersionString}.`,
    };
  }
  return {
    code: "NODE_VERSION_MISMATCH",
    severity: "error",
    message: `Node.js ${installedVersionString} does not satisfy the required ${requiredVersionString}.`,
    suggestion: `Switch to a Node.js version that satisfies ${requiredVersionString}.`,
  };
}
