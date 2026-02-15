/**
 * @fileoverview Tests renderUsedImportLines behavior.
 */
import { describe, expect, it } from "bun:test";
import { renderUsedImportLines } from "./render-used-import-lines";

describe("renderUsedImportLines", () => {
  it("extracts only imports referenced by the handler source", () => {
    const endpointModuleSource = `
import "./setup";
import { usedValue, unusedValue } from "./values";
`;
    const lines = renderUsedImportLines(
      "/tmp/endpoints.ts",
      endpointModuleSource,
      "return usedValue;",
    );

    expect(lines.some((line) => line.startsWith("import "))).toBe(true);
    expect(lines.some((line) => line.includes("usedValue"))).toBe(true);
    expect(lines.some((line) => line.includes("unusedValue"))).toBe(false);
  });
});
