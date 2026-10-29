import { parse } from "yaml";
import { UnsupportedLockfileError } from "./shared.js";

// Yarn records registry ranges as npm:<range>, while package.json has just <range>.
// Aliases (npm:other-pkg@^1.0.0) are written the same way in both, so keep them.
function toManifestSpecifier(descriptorRange) {
  const range = descriptorRange.replace(/^npm:/, "");
  return range.includes("@") ? descriptorRange : range;
}

export default function parseYarnLockfile(rawLockfileContent, lockfileName) {
  if (rawLockfileContent.includes("# yarn lockfile v1")) {
    throw new UnsupportedLockfileError(
      `${lockfileName} is a Yarn classic (v1) lockfile, which is not supported.`,
      "Upgrade to Yarn 2 or newer (`yarn set version stable`), then run `yarn install`.",
    );
  }

  const lockfile = parse(rawLockfileContent);
  const versionsByDescriptor = new Map();
  let rootEntry;
  for (const [key, entry] of Object.entries(lockfile)) {
    if (key === "__metadata") continue;
    // A key lists every descriptor resolved to this entry: "ms@npm:^2.1.0, ms@npm:^2.1.3".
    for (const descriptor of key.split(", ")) {
      versionsByDescriptor.set(descriptor, entry.version);
      if (descriptor.endsWith("@workspace:.")) rootEntry = entry;
    }
  }

  // Yarn merges dependencies, devDependencies and optionalDependencies of the root here.
  const lockedDependencies = new Map();
  for (const [name, descriptorRange] of Object.entries(
    rootEntry?.dependencies ?? {},
  )) {
    lockedDependencies.set(name, {
      specifier: toManifestSpecifier(descriptorRange),
      version: versionsByDescriptor.get(`${name}@${descriptorRange}`),
    });
  }
  return lockedDependencies;
}
