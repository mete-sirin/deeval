import { DEPENDENCY_SECTIONS, UnsupportedLockfileError } from "./shared.js";

// packages entries start with a resolution like "ms@2.1.3" or "@scope/pkg@1.0.0".
const versionFromResolution = (resolution) =>
  resolution?.slice(resolution.lastIndexOf("@") + 1);

export default function parseBunLockfile(rawLockfileContent) {
  // bun.lock is JSON with trailing commas.
  const lockfile = JSON.parse(rawLockfileContent.replace(/,(\s*[}\]])/g, "$1"));
  const root = lockfile.workspaces?.[""] ?? {};

  const lockedDependencies = new Map();
  for (const section of DEPENDENCY_SECTIONS) {
    for (const [name, specifier] of Object.entries(root[section] ?? {})) {
      lockedDependencies.set(name, {
        specifier,
        version: versionFromResolution(lockfile.packages?.[name]?.[0]),
      });
    }
  }
  return lockedDependencies;
}

export function parseBunBinaryLockfile() {
  throw new UnsupportedLockfileError(
    "bun.lockb is Bun's binary lockfile, which deeval cannot read.",
    "Run `bun install --save-text-lockfile` to create a text bun.lock, then delete bun.lockb.",
  );
}
