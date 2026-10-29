/**
 * @typedef {{
 *   code: string,
 *   severity: "ok" | "info" | "warning" | "error",
 *   message: string,
 *   suggestion?: string,
 * }} Finding
 */

// Problems are printed last so they sit right above the summary.
const SEVERITY_ORDER = ["ok", "info", "warning", "error"];
const SEVERITY_LABELS = {
  ok: "[OK]   ",
  info: "[INFO] ",
  warning: "[WARN] ",
  error: "[ERROR]",
};

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** @param {import("./inspect.js").InspectionResult} result */
export function formatReport(result) {
  if (!result.isJavaScriptProject) {
    return `No package.json found in ${result.projectRoot}, so this is not a JavaScript project deeval can inspect. If you have a monorepo for a fullstack web application, run deeval in the client and server folders independently.`;
  }

  const lines = [
    "deeval: project inspection",
    "",
    `Project: ${result.projectRoot}`,
    `Runtime: ${result.runtime}`,
    `Package manager: ${result.packageManager ?? "unknown"}${result.lockfileName ? ` (${result.lockfileName})` : ""}`,
    "",
  ];

  const sortedFindings = [...result.findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );
  for (const finding of sortedFindings) {
    lines.push(`${SEVERITY_LABELS[finding.severity]} ${finding.message}`);
  }

  const errorCount = result.findings.filter(
    ({ severity }) => severity === "error",
  ).length;
  const warningCount = result.findings.filter(
    ({ severity }) => severity === "warning",
  ).length;
  lines.push(
    "",
    errorCount + warningCount === 0
      ? "Summary: no problems found"
      : `Summary: ${plural(errorCount, "error")}, ${plural(warningCount, "warning")}`,
  );

  // Several findings often share one fix (e.g. `pnpm install`), so list it once.
  const suggestions = [
    ...new Set(
      [...sortedFindings]
        .reverse()
        .map(({ suggestion }) => suggestion)
        .filter(Boolean),
    ),
  ];
  if (suggestions.length > 0) {
    lines.push("", "Suggested actions:");
    suggestions.forEach((suggestion, i) => lines.push(`${i + 1}. ${suggestion}`));
  }

  return lines.join("\n");
}

/** @param {import("./inspect.js").InspectionResult} result */
export function exitCodeFor(result) {
  if (!result.isJavaScriptProject) return 2;
  return result.findings.some(({ severity }) => severity === "error") ? 1 : 0;
}
