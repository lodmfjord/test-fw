import { describe, expect, it } from "bun:test";
import { countExportedFunctions } from "./countExportedFunctions";

describe("countExportedFunctions", () => {
  it("counts exported function declarations", () => {
    const source = `
      export function a() {}
      export async function b() {}
    `;

    expect(countExportedFunctions(source)).toBe(2);
  });

  it("counts exported arrow functions", () => {
    const source = `
      export const one = () => 1;
      export const two = async () => 2;
    `;

    expect(countExportedFunctions(source)).toBe(2);
  });

  it("ignores matches in comments and strings", () => {
    const source = `
      // export function fake() {}
      const text = "export const fake = () => 1";
      const template = \`export default function fake() {}\`;
      export function real() {}
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });
});
