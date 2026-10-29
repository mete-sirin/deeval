import { DEPENDENCY_SECTIONS, UnsupportedLockfileError } from "./shared.js";

export default function parseNpmLockfile(rawLockfileContent, lockfileName) {
  const lockfile = JSON.parse(rawLockfileContent);
  // lockfileVersion 2 and 3 record the root package under packages[""].
  const root = lockfile.packages?.[""];
  if (!root) {
    throw new UnsupportedLockfileError(
      `${lockfileName} uses lockfileVersion ${lockfile.lockfileVersion}, which is not supported.`,
      `Run \`npm install\` with npm 7 or newer to upgrade ${lockfileName}.`,
    );
  }

  const lockedDependencies = new Map();
  for (const section of DEPENDENCY_SECTIONS) {
    for (const [name, specifier] of Object.entries(root[section] ?? {})) {
      lockedDependencies.set(name, {
        specifier,
        version: lockfile.packages[`node_modules/${name}`]?.version,
      });
    }
  }
  return lockedDependencies;
}
