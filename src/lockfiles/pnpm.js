import { parseAllDocuments } from "yaml";
import { DEPENDENCY_SECTIONS, UnsupportedLockfileError } from "./shared.js";

export default function parsePnpmLockfile(rawLockfileContent, lockfileName) {
  // pnpm can prepend a document for its own config dependencies.
  const yamlDocument = parseAllDocuments(rawLockfileContent).at(-1);
  if (yamlDocument.errors.length > 0) throw yamlDocument.errors[0];
  const lockfile = yamlDocument.toJS();

  if (parseFloat(String(lockfile.lockfileVersion)) < 6) {
    throw new UnsupportedLockfileError(
      `${lockfileName} uses lockfileVersion ${lockfile.lockfileVersion}, which is not supported.`,
      `Run \`pnpm install\` with pnpm 8 or newer to upgrade ${lockfileName}.`,
    );
  }

  // v9 always uses importers; v6–v8 put a single project's sections at the top level.
  const root = lockfile.importers?.["."] ?? lockfile;
  const lockedDependencies = new Map();
  for (const section of DEPENDENCY_SECTIONS) {
    for (const [name, { specifier, version }] of Object.entries(
      root[section] ?? {},
    )) {
      lockedDependencies.set(name, { specifier, version });
    }
  }
  return lockedDependencies;
}
