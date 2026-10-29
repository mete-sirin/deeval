export const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
];

// Thrown by a parser when it recognizes a lockfile format deeval can't read.
export class UnsupportedLockfileError extends Error {
  constructor(message, suggestion) {
    super(message);
    this.suggestion = suggestion;
  }
}

// pnpm appends resolved peers to versions, e.g. 1.2.3(react@18.0.0).
export const stripPeerSuffix = (version) => version.replace(/\(.*$/, "");
