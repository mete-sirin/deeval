import fs from "node:fs";
import path from "node:path";
import semver from "semver";

const VERSION_FILES = [".nvmrc", ".node-version"];

const VERSION_FILE_SUGGESTIONS = {
  ".nvmrc": "Run `nvm use` to switch to the Node.js version in .nvmrc.",
  ".node-version":
    "Switch to the Node.js version in .node-version (fnm, nodenv and volta read it).",
};

// First non-empty line that isn't a comment: "v20.11.1", "20" or "lts/iron".
function readVersionFile(filePath) {
  try {
    return fs
      .readFileSync(filePath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#"));
  } catch {
    return undefined;
  }
}

/** @returns {{ source: string, range: string }[]} */
export function readNodeRequirements(projectRoot, manifest) {
  const requirements = [];
  if (manifest?.engines?.node) {
    requirements.push({ source: "engines.node", range: manifest.engines.node });
  }
  for (const fileName of VERSION_FILES) {
    const range = readVersionFile(path.join(projectRoot, fileName));
    if (range) requirements.push({ source: fileName, range });
  }
  return requirements;
}

/**
 * @param {{ source: string, range: string }[]} requirements
 * @param {string | undefined} installedVersionString
 * @returns {import("../report.js").Finding[]}
 */
export default function checkNodeRuntime(requirements, installedVersionString) {
  if (requirements.length === 0) {
    return [
      {
        code: "NODE_REQUIREMENT_MISSING",
        severity: "warning",
        message:
          "No Node.js version requirement (engines.node, .nvmrc or .node-version).",
        suggestion:
          "Add an engines.node field to package.json so the required Node.js version is explicit.",
      },
    ];
  }
  if (!installedVersionString) {
    return [
      {
        code: "NODE_NOT_INSTALLED",
        severity: "error",
        message: "Node.js is not installed or not on PATH.",
        suggestion: "Install Node.js from https://nodejs.org or with a version manager such as nvm.",
      },
    ];
  }

  return requirements.map(({ source, range }) => {
    if (!semver.validRange(range)) {
      return {
        code: "NODE_REQUIREMENT_UNSUPPORTED",
        severity: "info",
        message: `Unable to evaluate the Node.js requirement ${range} from ${source} because its syntax is not supported. Please check manually that Node.js ${installedVersionString} satisfies it.`,
      };
    }
    if (semver.satisfies(installedVersionString, range)) {
      return {
        code: "NODE_VERSION_OK",
        severity: "ok",
        message: `Node.js ${installedVersionString} satisfies ${range} (${source}).`,
      };
    }
    // engines is a requirement; .nvmrc and .node-version only pin a preferred version.
    if (source === "engines.node") {
      return {
        code: "NODE_VERSION_MISMATCH",
        severity: "error",
        message: `Node.js ${installedVersionString} does not satisfy ${range} required by engines.node.`,
        suggestion: `Switch to a Node.js version that satisfies ${range}.`,
      };
    }
    return {
      code: "NODE_VERSION_FILE_MISMATCH",
      severity: "warning",
      message: `Node.js ${installedVersionString} does not match ${range} from ${source}.`,
      suggestion: VERSION_FILE_SUGGESTIONS[source],
    };
  });
}
