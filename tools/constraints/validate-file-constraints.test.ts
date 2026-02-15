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
 * Runs ${functionName}.
 * @param input - Input value.
 * @returns Output value.
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

  it("reports too many exported runtime symbols", () => {
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
    expect(errors.includes("too-many-exports.ts: has 2 exported runtime symbols (max 1).")).toBe(
      true,
    );
  });

  it("reports too many lines", () => {
    const source = `/**\n * @fileoverview Too many lines.\n */\n${makeLineBlock(220)}`;
    const errors = validateFileConstraints("too-many-lines.ts", source);
    expect(
      errors.some(
        (error) => error.includes("too-many-lines.ts: has") && error.includes("lines (max 220)."),
      ),
    ).toBe(true);
  });

  it("allows test files up to 260 lines", () => {
    const source = `/**\n * @fileoverview Long test file.\n */\n${makeLineBlock(257)}`;
    const errors = validateFileConstraints("libs/sample/src/long-file.test.ts", source);

    expect(errors.some((error) => error.includes("lines (max"))).toBe(false);
  });

  it("reports test files above 260 lines", () => {
    const source = `/**\n * @fileoverview Too many test lines.\n */\n${makeLineBlock(260)}`;
    const errors = validateFileConstraints("libs/sample/src/too-many-lines.test.ts", source);

    expect(
      errors.some(
        (error) =>
          error.includes("too-many-lines.test.ts: has") && error.includes("lines (max 260)."),
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

  it("reports nested ternary operations", () => {
    const source = `
/**
 * @fileoverview File.
 */
/**
 * Handles nested.
 * @param input - Input value.
 * @example
 * nested(input)
 */
export function nested(input: number) {
  return input > 0 ? (input > 1 ? "big" : "small") : "none";
}
`;
    const errors = validateFileConstraints("nested-ternary.ts", source);
    expect(errors.includes("nested-ternary.ts: nested ternary operations are not allowed.")).toBe(
      true,
    );
  });

  it("reports exported helper-object bags", () => {
    const source = `
/**
 * @fileoverview File.
 */
function one() {
  return 1;
}

function two() {
  return 2;
}

export const helpers = {
  one,
  two,
};
`;
    const errors = validateFileConstraints("helpers.ts", source);

    expect(
      errors.includes(
        'helpers.ts: exported helper-object bags are not allowed ("helpers"). Keep helpers file-local and export one public entry function.',
      ),
    ).toBe(true);
  });

  it("reports src function density violations", () => {
    const source = `
/**
 * @fileoverview File.
 */
/**
 * Handles run.
 * @param input - Input value.
 * @example
 * run(input)
 */
export function run(input: string): string {
${makeLineBlock(200)}
  return input;
}
`;
    const errors = validateFileConstraints("libs/sample/src/too-long.ts", source);

    expect(
      errors.includes('libs/sample/src/too-long.ts:11: function "run" has 203 lines (max 160).'),
    ).toBe(true);
  });

  it("reports direct console usage in runtime files", () => {
    const source = `
/**
 * @fileoverview File.
 */
export function run() {
  console.error("x");
}
`;
    const errors = validateFileConstraints("libs/sample/src/runtime.ts", source);

    expect(
      errors.includes(
        "libs/sample/src/runtime.ts:6: direct console.error calls are not allowed in runtime code; inject a logger instead.",
      ),
    ).toBe(true);
  });

  it("reports unsafe casts in runtime files", () => {
    const source = `
/**
 * @fileoverview File.
 */
const one = value as never;
const two = value as unknown as { id: string };
`;
    const errors = validateFileConstraints("libs/sample/src/runtime.ts", source);

    expect(
      errors.includes(
        'libs/sample/src/runtime.ts:5: unsafe cast "as never" is not allowed in non-test code.',
      ),
    ).toBe(true);
    expect(
      errors.includes(
        'libs/sample/src/runtime.ts:6: unsafe cast "as unknown as" requires an immediately preceding "// unsafe-cast:" comment.',
      ),
    ).toBe(true);
  });
});
