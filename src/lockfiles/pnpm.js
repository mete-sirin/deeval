import fs from "node:fs";
import path from "node:path";
import { parseAllDocuments } from "yaml";

export default function parsePnpmLockfile(projectRoot, lockfileName) {
  const rawLockfileContent = fs.readFileSync(
    path.join(projectRoot, lockfileName),
    "utf8",
  );
  const yamlDocuments = parseAllDocuments(rawLockfileContent).map(
    (yamlDocument) => yamlDocument.toJS(),
  );
  return new Map(
    Object.entries(yamlDocuments.at(-1).importers["."].dependencies ?? {}),
  );
}
