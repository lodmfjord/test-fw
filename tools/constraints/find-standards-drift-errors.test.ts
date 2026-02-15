/**
 * @fileoverview Tests standards drift checks for AGENTS and README.
 */
import { describe, expect, it } from "bun:test";
import { findStandardsDriftErrors } from "./find-standards-drift-errors";

/** Builds valid drift-check input. */
function toValidInput(): Parameters<typeof findStandardsDriftErrors>[0] {
  return {
    agentsFilePath: "AGENTS.md",
    agentsSource: `
# Project Rules

- AGENTS.md is the authoritative standards document for this repository.
- In non-test source files, each file may export at most one runtime symbol.
- Each non-test source file outside src must be at most 220 lines.
- Each non-test source file in src must be at most 220 lines.
- Each test source file must be at most 260 lines.
- Each top-level function in non-test src files must be at most 160 lines.
- Each top-level function in non-test src files must have cognitive complexity at most 30.
`,
    readmeFilePath: "README.md",
    readmeSource: `
# babbstack

For authoritative repository standards and exact constraint values, see AGENTS.md.
`,
    runtimeExportSurfaceSource: "const MAX_RUNTIME_EXPORT_SYMBOLS = 1;",
    srcFunctionDensitySource:
      "const MAX_SRC_FUNCTION_LINES = 160; const MAX_SRC_FUNCTION_COGNITIVE_COMPLEXITY = 30;",
    validateFileConstraintsSource:
      "const MAX_OTHER_FILE_LINES = 220; const MAX_SRC_FILE_LINES = 220; const MAX_TEST_FILE_LINES = 260;",
  };
}

describe("findStandardsDriftErrors", () => {
  it("returns no errors when AGENTS and README align with enforced limits", () => {
    expect(findStandardsDriftErrors(toValidInput())).toEqual([]);
  });

  it("reports missing AGENTS authoritative declaration", () => {
    const input = toValidInput();
    input.agentsSource = input.agentsSource.replace(
      "- AGENTS.md is the authoritative standards document for this repository.",
      "- AGENTS.md lists some project notes.",
    );

    expect(findStandardsDriftErrors(input)).toContain(
      "AGENTS.md: must declare AGENTS.md as the authoritative standards document.",
    );
  });

  it("reports missing AGENTS numeric limit entries", () => {
    const input = toValidInput();
    input.agentsSource = `
# Project Rules

- AGENTS.md is the authoritative standards document for this repository.
`;

    const errors = findStandardsDriftErrors(input);
    expect(errors).toContain("AGENTS.md: must document runtime export symbol limit (1).");
    expect(errors).toContain("AGENTS.md: must document max non-src file lines (220).");
    expect(errors).toContain("AGENTS.md: must document max src file lines (220).");
    expect(errors).toContain("AGENTS.md: must document max test file lines (260).");
    expect(errors).toContain("AGENTS.md: must document src top-level function max lines (160).");
    expect(errors).toContain(
      "AGENTS.md: must document src function cognitive complexity max (30).",
    );
  });

  it("reports README when authoritative pointer is missing", () => {
    const input = toValidInput();
    input.readmeSource = "# babbstack";

    expect(findStandardsDriftErrors(input)).toContain(
      'README.md: must include standards pointer "For authoritative repository standards and exact constraint values, see AGENTS.md.".',
    );
  });

  it("reports README when numeric limits are duplicated", () => {
    const input = toValidInput();
    input.readmeSource = `
# babbstack

For authoritative repository standards and exact constraint values, see AGENTS.md.

- Each test source file must be at most 260 lines.
`;

    expect(findStandardsDriftErrors(input)).toContain(
      "README.md: must not duplicate exact numeric constraints; keep AGENTS.md as the single source of truth.",
    );
  });

  it("reports parse failures as constraint errors", () => {
    const input = toValidInput();
    input.validateFileConstraintsSource = "const OTHER = 1;";

    const errors = findStandardsDriftErrors(input);
    expect(errors).toEqual([
      'tools/constraints: cannot evaluate standards drift checks ("Unable to parse constant "MAX_OTHER_FILE_LINES" from constraints source.").',
    ]);
  });
});
