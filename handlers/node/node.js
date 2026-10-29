import fs from "node:fs";
import path from "node:path";
import resolveActiveLockfile from "./resolveLockFile.js";
import compareNodeVersions from "./checkNodeRuntime.js";
import compareDependencies from "./compareDependencies.js";
const NODE_LOCKFILES = [
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

const nodeRuntimeHandler = {
  name: "Node.js",
  detectRuntime: (projectFileNames) => projectFileNames.has("package.json"),

  findPresentLockfiles: (projectFileNames) => {
    const projectFileNameList = [...projectFileNames];
    return new Set(
      projectFileNameList.filter((fileName) => {
        for (const supportedLockfile of NODE_LOCKFILES)
          if (fileName === supportedLockfile) return fileName;
      }),
    );
  },

  inspectDependencies: (presentLockfiles) => {
    const packageJsonContent = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"),
    );

    const nodeRequirement = packageJsonContent?.engines?.node;
    if (!nodeRequirement)
      console.log(
        "WARNING!: No engine specified in the package.json. Please manually check the minimum Node.js runtime requirement.",
      );
    else {
      const installedNodeVersion = process.versions.node;
      compareNodeVersions(nodeRequirement, installedNodeVersion);
    }
    let declaredDependencies;
    try {
      declaredDependencies = new Map(
        Object.entries(packageJsonContent.dependencies),
      );
    } catch (err) {
      throw new Error(
        `No depenencies list found in the manifest file.${path.join(process.cwd(), "package.json")}`,
      );
    }

    const activeLockfile = resolveActiveLockfile(presentLockfiles);
    const lockedDependencies = activeLockfile.parseLockfile(
      activeLockfile.lockfileName,
    );
    compareDependencies(declaredDependencies, lockedDependencies);
  },
};

export default nodeRuntimeHandler;
