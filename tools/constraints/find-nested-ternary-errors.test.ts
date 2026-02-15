/**
 * @fileoverview Tests nested ternary constraint detection.
 */
import { describe, expect, it } from "bun:test";
import { findNestedTernaryErrors } from "./find-nested-ternary-errors";

describe("findNestedTernaryErrors", () => {
  it("returns no errors when there are no ternaries", () => {
    const source = `
/**
 * @fileoverview File.
 */
const value = 1;
`;
    expect(findNestedTernaryErrors("plain.ts", source)).toEqual([]);
  });

  it("returns no errors for a single non-nested ternary", () => {
    const source = `
/**
 * @fileoverview File.
 */
const value = flag ? "yes" : "no";
`;
    expect(findNestedTernaryErrors("single.ts", source)).toEqual([]);
  });

  it("reports nested ternary in the true branch", () => {
    const source = `
/**
 * @fileoverview File.
 */
const value = first ? (second ? "a" : "b") : "c";
`;
    expect(findNestedTernaryErrors("nested-true.ts", source)).toEqual([
      "nested-true.ts: nested ternary operations are not allowed.",
    ]);
  });

  it("reports nested ternary in the false branch", () => {
    const source = `
/**
 * @fileoverview File.
 */
const value = first ? "a" : second ? "b" : "c";
`;
    expect(findNestedTernaryErrors("nested-false.ts", source)).toEqual([
      "nested-false.ts: nested ternary operations are not allowed.",
    ]);
  });
});
