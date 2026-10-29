import { execFileSync } from "node:child_process";
import semver from "semver";

// Runs `<command> --version` without a shell. Returns undefined when the
// binary is missing, hangs or prints something that isn't a version.
export function versionOf(command) {
  try {
    const output = execFileSync(command, ["--version"], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return semver.clean(output.trim()) ?? undefined;
  } catch {
    return undefined;
  }
}

// Under Bun, process.versions.node is Bun's compatibility version, not a real Node.js.
export const installedNodeVersion = () =>
  process.versions.bun ? versionOf("node") : process.versions.node;

export const installedBunVersion = () => process.versions.bun ?? versionOf("bun");
