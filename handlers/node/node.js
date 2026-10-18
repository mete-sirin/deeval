import fs from "node:fs";
import resolveActiveLockfile from "./resolveLockFile.js";
const nodeEcosystemConfig = {
  supportedLockfiles: [
    "package-lock.json",
    "npm-shrinkwrap.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
  ],
};

const nodeRuntimeHandler = {
  name: "Node.js",
  detectRuntime: (projectFileNames) => projectFileNames.has("package.json"),

  findPresentLockfiles: (projectFileNames) => {
    const projectFileNameList = [...projectFileNames];
    return new Set(
      projectFileNameList.filter((fileName) => {
        for (const supportedLockfile of nodeEcosystemConfig.supportedLockfiles)
          if (fileName === supportedLockfile) return fileName;
      }),
    );
  },

  inspectDependencies: (presentLockfiles) => {
    const declaredDependencies = new Map(
      Object.entries(
        JSON.parse(
          fs.readFileSync(process.cwd().concat("/package.json"), "utf8"),
        ).dependencies,
      ),
    );
    const activeLockfile = resolveActiveLockfile(presentLockfiles);
    const lockedDependencies = activeLockfile.parseLockfile(
      activeLockfile.lockfileName,
    );
    console.log(lockedDependencies);
  },
};

export default nodeRuntimeHandler;
