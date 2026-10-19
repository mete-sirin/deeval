import fs, { readFileSync } from "node:fs";
import { resolveProjectFilePath } from "../../helperFunctions.js";
import { parseAllDocuments } from "yaml";

function parseNpmLockfile(lockfileName) {
  const rawLockfileContent = fs.readFileSync(
    resolveProjectFilePath(lockfileName),
    "utf8",
  );
  const lockedPackagesMap = new Map(
    Object.entries(JSON.parse(rawLockfileContent).packages),
  );

  return lockedPackagesMap;
}

function parsePnpmLockfile(lockfileName) {
  const rawLockfileContent = readFileSync(
    resolveProjectFilePath(lockfileName),
    "utf8",
  );
  const yamlDocuments = parseAllDocuments(rawLockfileContent).map(
    (yamlDocument) => yamlDocument.toJS(),
  );
  const lockedDependenciesMap = new Map(
    Object.entries(yamlDocuments.at(-1).importers["."].dependencies),
  );
  return lockedDependenciesMap;
}

const lockfileParsers = {
  "package-lock.json": parseNpmLockfile,
  "pnpm-lock.yaml": parsePnpmLockfile,
};

export { parseNpmLockfile, parsePnpmLockfile, lockfileParsers };
