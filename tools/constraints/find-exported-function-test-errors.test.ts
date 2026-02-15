/**
 * @fileoverview Tests exported function test coverage constraints.
 */
import { describe, expect, it } from "bun:test";
import { findExportedFunctionTestErrors } from "./find-exported-function-test-errors";

describe("findExportedFunctionTestErrors", () => {
  it("returns no errors when a libs exported function has a sibling test file", () => {
    const errors = findExportedFunctionTestErrors({
      fileSources: [
        {
          filePath: "libs/example/src/do-work.ts",
          source: `
/**
 * @fileoverview File.
 */
/**
 * Handles doWork.
 * @param input - Input value.
 * @example
 * doWork(input)
 */
export function doWork(input: string) {
  return input;
}
`,
        },
        {
          filePath: "libs/example/src/do-work.test.ts",
          source: `
/**
 * @fileoverview Test file.
 */
import { describe, expect, it } from "bun:test";
import { doWork } from "./do-work";

describe("doWork", () => {
  it("returns input", () => {
    expect(doWork("a")).toBe("a");
  });
});
`,
        },
      ],
    });

    expect(errors).toEqual([]);
  });

  it("reports an error when a libs exported function has no sibling test file", () => {
    const errors = findExportedFunctionTestErrors({
      fileSources: [
        {
          filePath: "libs/example/src/do-work.ts",
          source: `
/**
 * @fileoverview File.
 */
/**
 * Handles doWork.
 * @param input - Input value.
 * @example
 * doWork(input)
 */
export function doWork(input: string) {
  return input;
}
`,
        },
      ],
    });

    expect(errors).toEqual([
      'libs/example/src/do-work.ts: exported function file must have a sibling test file ("do-work.test.ts").',
    ]);
  });

  it("ignores files without exported functions", () => {
    const errors = findExportedFunctionTestErrors({
      fileSources: [
        {
          filePath: "libs/example/src/types.ts",
          source: `
/**
 * @fileoverview File.
 */
export type Example = { id: string };
`,
        },
      ],
    });

    expect(errors).toEqual([]);
  });

  it("checks only libs by default", () => {
    const errors = findExportedFunctionTestErrors({
      fileSources: [
        {
          filePath: "apps/example/src/do-work.ts",
          source: `
/**
 * @fileoverview File.
 */
/**
 * Handles doWork.
 * @param input - Input value.
 * @example
 * doWork(input)
 */
export function doWork(input: string) {
  return input;
}
`,
        },
      ],
    });

    expect(errors).toEqual([]);
  });

  it("supports checking apps when configured", () => {
    const errors = findExportedFunctionTestErrors({
      fileSources: [
        {
          filePath: "apps/example/src/do-work.ts",
          source: `
/**
 * @fileoverview File.
 */
/**
 * Handles doWork.
 * @param input - Input value.
 * @example
 * doWork(input)
 */
export function doWork(input: string) {
  return input;
}
`,
        },
      ],
      targetRoots: ["apps", "libs"],
    });

    expect(errors).toEqual([
      'apps/example/src/do-work.ts: exported function file must have a sibling test file ("do-work.test.ts").',
    ]);
  });

  it("supports allowlisting known untested files", () => {
    const errors = findExportedFunctionTestErrors({
      fileSources: [
        {
          filePath: "libs/example/src/do-work.ts",
          source: `
/**
 * @fileoverview File.
 */
/**
 * Handles doWork.
 * @param input - Input value.
 * @example
 * doWork(input)
 */
export function doWork(input: string) {
  return input;
}
`,
        },
      ],
      allowedUntestedFilePaths: new Set(["libs/example/src/do-work.ts"]),
    });

    expect(errors).toEqual([]);
  });
});
