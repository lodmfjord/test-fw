/**
 * @fileoverview Tests console usage constraint detection.
 */
import { describe, expect, it } from "bun:test";
import { findConsoleUsageErrors } from "./find-console-usage-errors";

describe("findConsoleUsageErrors", () => {
  it("reports direct console usage in runtime files", () => {
    const source = `
/**
 * @fileoverview File.
 */
export function run() {
  console.log("hello");
}
`;

    expect(findConsoleUsageErrors("libs/sample/src/runtime.ts", source)).toEqual([
      "libs/sample/src/runtime.ts:6: direct console.log calls are not allowed in runtime code; inject a logger instead.",
    ]);
  });

  it("allows console usage in test files", () => {
    const source = `
/**
 * @fileoverview File.
 */
export function run() {
  console.log("hello");
}
`;

    expect(findConsoleUsageErrors("libs/sample/src/runtime.test.ts", source)).toEqual([]);
  });

  it("allows console usage in *-bin.ts files", () => {
    const source = `
/**
 * @fileoverview File.
 */
export function run() {
  console.log("hello");
}
`;

    expect(findConsoleUsageErrors("libs/sample/src/runtime-bin.ts", source)).toEqual([]);
  });

  it("ignores console text inside string literals", () => {
    const source = `
/**
 * @fileoverview File.
 */
const snippet = "console.log('hello')";
`;

    expect(findConsoleUsageErrors("libs/sample/src/runtime.ts", source)).toEqual([]);
  });
});
