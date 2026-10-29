import fs from "node:fs";
import path from "node:path";

export default function parseNpmLockfile(projectRoot, lockfileName) {
  const rawLockfileContent = fs.readFileSync(
    path.join(projectRoot, lockfileName),
    "utf8",
  );
  return new Map(Object.entries(JSON.parse(rawLockfileContent).packages));
}
