import { describe, expect, it } from "bun:test";
import { countExportedFunctions } from "./count-exported-functions";

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

  it("counts locally exported functions through export specifiers", () => {
    const source = `
      function declared() {}
      const arrow = () => 1;
      export { declared, arrow as renamedArrow };
    `;

    expect(countExportedFunctions(source)).toBe(2);
  });

  it("counts default exports that reference local functions", () => {
    const source = `
      const localHandler = () => ({ ok: true });
      export default localHandler;
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });

  it("counts anonymous default exported function expressions", () => {
    const source = `
      export default () => ({ ok: true });
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });

  it("ignores re-exported functions from other modules", () => {
    const source = `
      export { handler } from "./handlers";
      export * from "./handlers";
    `;

    expect(countExportedFunctions(source)).toBe(0);
  });

  it("ignores type-only exports", () => {
    const source = `
      type Handler = () => void;
      const localHandler = () => {};
      export type { Handler };
      export { type Handler as HandlerAlias };
      export type { Handler as PublicHandler } from "./types";
      export { localHandler };
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });

  it("counts each exported function in export const multi-declarations", () => {
    const source = `
      export const one = () => 1, two = () => 2;
    `;

    expect(countExportedFunctions(source)).toBe(2);
  });

  it("deduplicates the same local function exported multiple ways", () => {
    const source = `
      function run() {}
      export { run };
      export default run;
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });

  it("counts exported aliases that resolve to local functions", () => {
    const source = `
      const internal = () => 1;
      const alias = internal;
      export { alias };
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });

  it("does not count exported aliases that resolve to non-functions", () => {
    const source = `
      const value = 1;
      const alias = value;
      export { alias };
    `;

    expect(countExportedFunctions(source)).toBe(0);
  });

  it("counts default exported named function declarations", () => {
    const source = `
      export default function run() {
        return "ok";
      }
    `;

    expect(countExportedFunctions(source)).toBe(1);
  });
});
