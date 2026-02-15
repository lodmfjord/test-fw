/** @fileoverview Tests file constraint validation. @module tools/constraints/validate-file-constraints.test */
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
/** @fileoverview Valid file. @module valid */
/** Handles ${functionName}. @example \`${functionName}(input)\` */
export function ${functionName}() {
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
/** @fileoverview Too many exports. @module too-many-exports */
/** Handles one. @example \`one(input)\` */
export function one() {}
/** Handles two. @example \`two(input)\` */
export function two() {}
    `;

    const errors = validateFileConstraints("too-many-exports.ts", source);
    expect(errors.includes("too-many-exports.ts: has 2 exported functions (max 1).")).toBe(true);
  });

  it("reports too many lines", () => {
    const source = `/** @fileoverview Too many lines. @module too-many-lines */\n${makeLineBlock(300)}`;
    const errors = validateFileConstraints("too-many-lines.ts", source);
    expect(errors.includes("too-many-lines.ts: has 301 lines (max 300).")).toBe(true);
  });

  it("accepts dotted kebab-case names", () => {
    const source = "/** @fileoverview File. @module my-feature.test */\nconst value = 1;";
    expect(validateFileConstraints("my-feature.test.ts", source)).toEqual([]);
  });

  it("rejects camelCase file names", () => {
    const source = "/** @fileoverview File. @module myFeature */\nconst value = 1;";
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
/** @fileoverview File. @module exported */
/** Handles run. */
export function run() {}
`;
    const errors = validateFileConstraints("missing-example.ts", source);
    expect(
      errors.includes('missing-example.ts: exported function "run" JSDoc must include @example.'),
    ).toBe(true);
  });
});
