/**
 * @fileoverview Tests file constraint validation.
 */
import { describe, expect, it } from "bun:test";
import { validateFileConstraints } from "./validate-file-constraints";

/** Builds a source block with many lines. */
function makeLineBlock(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, index) => `const line${index} = ${index};`).join(
    "\n",
  );
}

/** Builds a valid documented exported function source. */
function toDocumentedExportedFunctionSource(functionName: string): string {
  return `
/**
 * @fileoverview Valid file.
 */
/**
 * Handles ${functionName}.
 * @param input - Input value.
 * @example
 * ${functionName}(input)
 */
export function ${functionName}(input: string) {
  void input;
  return 1;
}
`;
}

describe("validateFileConstraints", () => {
  it("returns no errors for a valid file", () => {
    const source = toDocumentedExportedFunctionSource("valid");

    expect(validateFileConstraints("valid.ts", source)).toEqual([]);
  });

  it("reports too many exported functions", () => {
    const source = `
/**
 * @fileoverview Too many exports.
 */
/**
 * Handles one.
 * @param input - Input value.
 * @example
 * one(input)
 */
export function one(input: string) {
  void input;
}
/**
 * Handles two.
 * @param input - Input value.
 * @example
 * two(input)
 */
export function two(input: string) {
  void input;
}
    `;

    const errors = validateFileConstraints("too-many-exports.ts", source);
    expect(errors.includes("too-many-exports.ts: has 2 exported functions (max 1).")).toBe(true);
  });

  it("reports too many lines", () => {
    const source = `/**\n * @fileoverview Too many lines.\n */\n${makeLineBlock(300)}`;
    const errors = validateFileConstraints("too-many-lines.ts", source);
    expect(
      errors.some(
        (error) => error.includes("too-many-lines.ts: has") && error.includes("lines (max 300)."),
      ),
    ).toBe(true);
  });

  it("accepts dotted kebab-case names", () => {
    const source = "/**\n * @fileoverview File.\n */\nconst value = 1;";
    expect(validateFileConstraints("my-feature.test.ts", source)).toEqual([]);
  });

  it("rejects camelCase file names", () => {
    const source = "/**\n * @fileoverview File.\n */\nconst value = 1;";
    const errors = validateFileConstraints("myFeature.ts", source);
    expect(errors.includes("myFeature.ts: file name must be kebab-case.")).toBe(true);
  });

  it("reports documentation constraint errors", () => {
    const source = `
export function undocumented() {
  return 1;
}
`;
    const errors = validateFileConstraints("undocumented.ts", source);
    expect(
      errors.includes("undocumented.ts: file must start with a file-level JSDoc header."),
    ).toBe(true);
    expect(errors.includes('undocumented.ts: function "undocumented" is missing JSDoc.')).toBe(
      true,
    );
  });

  it("reports missing @example for exported functions", () => {
    const source = `
/**
 * @fileoverview File.
 */
/**
 * Handles run.
 * @param input - Input value.
 */
export function run(input: string) {
  void input;
}
`;
    const errors = validateFileConstraints("missing-example.ts", source);
    expect(
      errors.includes('missing-example.ts: exported function "run" JSDoc must include @example.'),
    ).toBe(true);
  });
});
