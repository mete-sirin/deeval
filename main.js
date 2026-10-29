import inspect from "./src/inspect.js";
import { formatReport, exitCodeFor } from "./src/report.js";

const result = inspect(process.cwd());
console.log(formatReport(result));
process.exitCode = exitCodeFor(result);
