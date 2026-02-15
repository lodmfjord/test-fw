/**
 * @fileoverview Finds standards drift between enforced constraints and documentation.
 */
type FindStandardsDriftErrorsInput = {
  agentsFilePath: string;
  agentsSource: string;
  readmeFilePath: string;
  readmeSource: string;
  runtimeExportSurfaceSource: string;
  srcFunctionDensitySource: string;
  validateFileConstraintsSource: string;
};

type ExtractedLimits = {
  maxOtherFileLines: number;
  maxRuntimeExportSymbols: number;
  maxSrcFunctionCognitiveComplexity: number;
  maxSrcFileLines: number;
  maxSrcFunctionLines: number;
  maxTestFileLines: number;
};

const README_AUTHORITATIVE_POINTER =
  "For authoritative repository standards and exact constraint values, see AGENTS.md.";
const AGENTS_AUTHORITATIVE_PATTERN = /\bAGENTS\.md\b[^.\n]*\bauthoritative\b[^.\n]*\bstandards\b/i;

/** Converts constraint source to numeric constant value. */
function toNumericConstantValue(source: string, constantName: string): number {
  const match = new RegExp(`\\b${constantName}\\s*=\\s*(\\d+)\\b`).exec(source);
  if (!match) {
    throw new Error(`Unable to parse constant "${constantName}" from constraints source.`);
  }

  return Number(match[1]);
}

/** Converts constraint sources to extracted limit values. */
function toExtractedLimits(input: FindStandardsDriftErrorsInput): ExtractedLimits {
  return {
    maxOtherFileLines: toNumericConstantValue(input.validateFileConstraintsSource, "MAX_OTHER_FILE_LINES"),
    maxRuntimeExportSymbols: toNumericConstantValue(
      input.runtimeExportSurfaceSource,
      "MAX_RUNTIME_EXPORT_SYMBOLS",
    ),
    maxSrcFunctionCognitiveComplexity: toNumericConstantValue(
      input.srcFunctionDensitySource,
      "MAX_SRC_FUNCTION_COGNITIVE_COMPLEXITY",
    ),
    maxSrcFileLines: toNumericConstantValue(input.validateFileConstraintsSource, "MAX_SRC_FILE_LINES"),
    maxSrcFunctionLines: toNumericConstantValue(
      input.srcFunctionDensitySource,
      "MAX_SRC_FUNCTION_LINES",
    ),
    maxTestFileLines: toNumericConstantValue(input.validateFileConstraintsSource, "MAX_TEST_FILE_LINES"),
  };
}

/** Checks whether AGENTS documents runtime export limit. */
function hasRuntimeExportLimit(agentsSource: string, maxRuntimeExportSymbols: number): boolean {
  if (maxRuntimeExportSymbols === 1) {
    return /\b(?:one|1)\s+runtime\s+symbol\b/i.test(agentsSource);
  }

  return new RegExp(`\\b${maxRuntimeExportSymbols}\\b[^\\n]*runtime\\s+symbols?`, "i").test(
    agentsSource,
  );
}

/** Checks whether source documents a line-limit entry for a scope. */
function hasLineLimitEntry(source: string, scopePattern: string, maxLines: number): boolean {
  return new RegExp(`${scopePattern}[^\\n]*\\b${maxLines}\\b[^\\n]*\\blines\\b`, "i").test(source);
}

/** Checks whether AGENTS documents src top-level function line limit. */
function hasMaxSrcFunctionLines(agentsSource: string, maxSrcFunctionLines: number): boolean {
  return new RegExp(
    `top-level function[^\\n]*\\b${maxSrcFunctionLines}\\b[^\\n]*\\blines\\b`,
    "i",
  ).test(agentsSource);
}

/** Checks whether AGENTS documents src function cognitive complexity limit. */
function hasMaxSrcFunctionComplexity(
  agentsSource: string,
  maxSrcFunctionCognitiveComplexity: number,
): boolean {
  return new RegExp(
    `cognitive complexity[^\\n]*\\b${maxSrcFunctionCognitiveComplexity}\\b`,
    "i",
  ).test(agentsSource);
}

/** Checks whether README duplicates exact numeric limits. */
function hasReadmeDetailedLimits(readmeSource: string, limits: ExtractedLimits): boolean {
  const hasDetailedLineLimit =
    hasLineLimitEntry(readmeSource, "non-test[^\\n]*outside\\s+[^\\n]*src", limits.maxOtherFileLines) ||
    hasLineLimitEntry(readmeSource, "non-test[^\\n]*in\\s+[^\\n]*src", limits.maxSrcFileLines) ||
    hasLineLimitEntry(readmeSource, "test\\s+source\\s+file", limits.maxTestFileLines);
  const functionLineLimitPattern = new RegExp(
    `\\b${limits.maxSrcFunctionLines}\\b[^\\n]*top-level function`,
    "i",
  );
  const complexityPattern = new RegExp(
    `cognitive complexity[^\\n]*\\b${limits.maxSrcFunctionCognitiveComplexity}\\b`,
    "i",
  );
  const runtimeExportPattern =
    limits.maxRuntimeExportSymbols === 1
      ? /\b(?:one|1)\s+runtime\s+symbol\b/i
      : new RegExp(`\\b${limits.maxRuntimeExportSymbols}\\b[^\\n]*runtime\\s+symbols?`, "i");

  return (
    hasDetailedLineLimit ||
    functionLineLimitPattern.test(readmeSource) ||
    complexityPattern.test(readmeSource) ||
    runtimeExportPattern.test(readmeSource)
  );
}

/**
 * Finds standards drift errors for AGENTS and README documentation.
 * @param input - Documentation and constraints input.
 * @example
 * findStandardsDriftErrors(input)
 * @returns Output value.
 */
export function findStandardsDriftErrors(input: FindStandardsDriftErrorsInput): string[] {
  let limits: ExtractedLimits;
  try {
    limits = toExtractedLimits(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown constraints parse error";
    return [`tools/constraints: cannot evaluate standards drift checks ("${message}").`];
  }

  const errors: string[] = [];

  if (!AGENTS_AUTHORITATIVE_PATTERN.test(input.agentsSource)) {
    errors.push(
      `${input.agentsFilePath}: must declare AGENTS.md as the authoritative standards document.`,
    );
  }

  if (!hasRuntimeExportLimit(input.agentsSource, limits.maxRuntimeExportSymbols)) {
    errors.push(
      `${input.agentsFilePath}: must document runtime export symbol limit (${limits.maxRuntimeExportSymbols}).`,
    );
  }

  if (!hasLineLimitEntry(input.agentsSource, "non-test[^\\n]*outside\\s+[^\\n]*src", limits.maxOtherFileLines)) {
    errors.push(
      `${input.agentsFilePath}: must document max non-src file lines (${limits.maxOtherFileLines}).`,
    );
  }

  if (!hasLineLimitEntry(input.agentsSource, "non-test[^\\n]*in\\s+[^\\n]*src", limits.maxSrcFileLines)) {
    errors.push(
      `${input.agentsFilePath}: must document max src file lines (${limits.maxSrcFileLines}).`,
    );
  }

  if (!hasLineLimitEntry(input.agentsSource, "test\\s+source\\s+file", limits.maxTestFileLines)) {
    errors.push(
      `${input.agentsFilePath}: must document max test file lines (${limits.maxTestFileLines}).`,
    );
  }

  if (!hasMaxSrcFunctionLines(input.agentsSource, limits.maxSrcFunctionLines)) {
    errors.push(
      `${input.agentsFilePath}: must document src top-level function max lines (${limits.maxSrcFunctionLines}).`,
    );
  }

  if (!hasMaxSrcFunctionComplexity(input.agentsSource, limits.maxSrcFunctionCognitiveComplexity)) {
    errors.push(
      `${input.agentsFilePath}: must document src function cognitive complexity max (${limits.maxSrcFunctionCognitiveComplexity}).`,
    );
  }

  if (!input.readmeSource.includes(README_AUTHORITATIVE_POINTER)) {
    errors.push(
      `${input.readmeFilePath}: must include standards pointer "${README_AUTHORITATIVE_POINTER}".`,
    );
  }

  if (hasReadmeDetailedLimits(input.readmeSource, limits)) {
    errors.push(
      `${input.readmeFilePath}: must not duplicate exact numeric constraints; keep AGENTS.md as the single source of truth.`,
    );
  }

  return errors;
}
