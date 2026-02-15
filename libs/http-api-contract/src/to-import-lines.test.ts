/**
 * @fileoverview Tests toImportLines behavior.
 */
import { describe, expect, it } from "bun:test";
import { toImportLines } from "./to-import-lines";

describe("toImportLines", () => {
  it("keeps only imports used by handler source and preserves side effects", () => {
    const lines = toImportLines(import.meta.url, "run(foo);", [
      {
        moduleSpecifier: "./side-effect.ts",
        namedImports: [],
        sideEffectOnly: true,
      },
      {
        moduleSpecifier: "./helpers.ts",
        namedImports: [
          { imported: "foo", local: "foo" },
          { imported: "bar", local: "bar" },
        ],
        sideEffectOnly: false,
      },
    ]);

    expect(lines.length).toBe(2);
    expect(lines[0]?.startsWith("import ")).toBe(true);
    expect(lines[1]).toContain("foo");
    expect(lines[1]).not.toContain("bar");
  });
});
