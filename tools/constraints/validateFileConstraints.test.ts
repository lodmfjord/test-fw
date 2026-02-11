import { describe, expect, it } from "bun:test";
import { validateFileConstraints } from "./validateFileConstraints";

function makeLineBlock(lineCount: number): string {
  return Array.from({ length: lineCount }, (_, index) => `const line${index} = ${index};`).join(
    "\n",
  );
}

describe("validateFileConstraints", () => {
  it("returns no errors for a valid file", () => {
    const source = `
      export function valid() {
        return 1;
      }
    `;

    expect(validateFileConstraints("valid.ts", source)).toEqual([]);
  });

  it("reports too many exported functions", () => {
    const source = `
      export function one() {}
      export function two() {}
    `;

    const errors = validateFileConstraints("too-many-exports.ts", source);
    expect(errors.length).toBe(1);
    expect(errors[0]?.includes("too-many-exports.ts")).toBe(true);
  });

  it("reports too many lines", () => {
    const source = makeLineBlock(301);
    const errors = validateFileConstraints("too-many-lines.ts", source);
    expect(errors.length).toBe(1);
    expect(errors[0]?.includes("301 lines")).toBe(true);
  });
});
