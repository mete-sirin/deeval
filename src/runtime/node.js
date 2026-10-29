const VERSION_REQUIREMENT_REGEX = /^([^\d\s]+)?\s*(\d+(?:\.\d+){0,2})$/;

const COMPARING_RULES = {
  ">=": (compareFlag) => compareFlag >= 0,
  "<=": (compareFlag) => compareFlag <= 0,
  ">": (compareFlag) => compareFlag > 0,
  "<": (compareFlag) => compareFlag < 0,
  "=": (compareFlag) => compareFlag === 0,
  "": (compareFlag) => compareFlag === 0, // exact version like 18.0.0
};

function compareVersionParts(installedVersion, requiredVersion) {
  const versionLength = Math.min(
    requiredVersion.length,
    installedVersion.length,
  );
  for (let i = 0; i < versionLength; i++) {
    if (installedVersion[i] > requiredVersion[i]) return 1;
    if (installedVersion[i] < requiredVersion[i]) return -1;
  }
  return 0;
}

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

  const requiredVersionValues = requiredVersionString
    .trim()
    .match(VERSION_REQUIREMENT_REGEX);
  const operator = requiredVersionValues?.[1] ?? "";
  const isSatisfied = COMPARING_RULES[operator];

  if (!requiredVersionValues || !isSatisfied) {
    return {
      code: "NODE_REQUIREMENT_UNSUPPORTED",
      severity: "info",
      message: `Unable to evaluate the Node.js requirement ${requiredVersionString} because its syntax is not supported. Please check manually that Node.js ${installedVersionString} satisfies it.`,
    };
  }

  const toParts = (versionString) =>
    versionString
      .trim()
      .split(".")
      .map((text) => Number(text));
  const compareFlag = compareVersionParts(
    toParts(installedVersionString),
    toParts(requiredVersionValues[2]),
  );

  if (isSatisfied(compareFlag)) {
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
