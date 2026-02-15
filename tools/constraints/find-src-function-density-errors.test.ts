/**
 * @fileoverview Tests src function density constraint validation.
 */
import { describe, expect, it } from "bun:test";
import { findSrcFunctionDensityErrors } from "./find-src-function-density-errors";

/** Builds a function source with a configurable number of body lines. */
function toFunctionSource(lineCount: number): string {
  const body = Array.from(
    { length: lineCount },
    (_, index) => `  const value${index} = ${index};`,
  ).join("\n");

  return `
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
${body}
  return input;
}
`;
}

describe("findSrcFunctionDensityErrors", () => {
  it("returns no errors outside src", () => {
    const source = toFunctionSource(200);

    expect(findSrcFunctionDensityErrors("tools/check-constraints.ts", source)).toEqual([]);
  });

  it("returns no errors for src test files", () => {
    const source = toFunctionSource(200);

    expect(findSrcFunctionDensityErrors("libs/sample/src/sample.test.ts", source)).toEqual([]);
  });

  it("reports max function length violations for src", () => {
    const source = toFunctionSource(200);
    const errors = findSrcFunctionDensityErrors("libs/sample/src/too-long.ts", source);

    expect(
      errors.includes('libs/sample/src/too-long.ts:11: function "run" has 203 lines (max 160).'),
    ).toBe(true);
  });

  it("reports cognitive complexity violations for src", () => {
    const conditionalBlocks = Array.from(
      { length: 31 },
      (_, index) => `  if (values[${index}] > ${index}) {\n    total += ${index};\n  }`,
    ).join("\n");
    const source = `
/**
 * @fileoverview File.
 */
/**
 * Handles run.
 * @param values - Values parameter.
 * @example
 * run(values)
 */
export function run(values: number[]): number {
  let total = 0;
${conditionalBlocks}
  return total;
}
`;
    const errors = findSrcFunctionDensityErrors("libs/sample/src/too-complex.ts", source);

    expect(
      errors.includes(
        'libs/sample/src/too-complex.ts:11: function "run" has cognitive complexity 31 (max 30).',
      ),
    ).toBe(true);
  });
});
