import fs from "node:fs";
import path from "node:path";
import runtimeHandlers from "./handlers/handlers.js";

const projectRootPath = process.cwd();
const projectFileNames = new Set(
  fs.readdirSync(projectRootPath).filter((entryName) => {
    const entryPath = path.join(projectRootPath, entryName);
    return fs.statSync(entryPath).isFile();
  }),
);

if (projectFileNames.size === 0) {
  console.log(
    `Couldn't find any files in this directory. If you have a monorepo for a fullstack web application please run the script in the client and server folders independently.`,
  );
}

for (const runtimeHandler of runtimeHandlers) {
  if (runtimeHandler.detectRuntime(projectFileNames)) {
    console.log(
      `Found the manifest file. Starting the evaluation now.\nDetected runtime: ${runtimeHandler.name}.`,
    );
    const presentLockfiles = runtimeHandler.findPresentLockfiles(projectFileNames);
    runtimeHandler.inspectDependencies(presentLockfiles);
  }
}
