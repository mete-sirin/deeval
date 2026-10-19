import { lockfileParsers } from "./nodeParsers.js";

const lockfilePriorityOrder = [
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "npm-shrinkwrap.json",
  "bun.lockb",
];

export default function resolveActiveLockfile(presentLockfiles) {
  const matchedLockfiles = lockfilePriorityOrder.filter((lockfileName) =>
    presentLockfiles.has(lockfileName),
  );
  if (matchedLockfiles.lenght === 0) throw new Error("No Lockfile detected.");
  if (matchedLockfiles.length > 1)
    console.log(
      `Detected more than one lockfile. Using ${matchedLockfiles[0]}`,
    );
  const parseLockfile = lockfileParsers[matchedLockfiles[0]];
  return {
    parseLockfile,
    lockfileName: matchedLockfiles[0],
  };
}
