/**
 * @fileoverview Tests toImportPath behavior.
 */
import { describe, expect, it } from "bun:test";
import { toImportPath } from "./to-import-path";

describe("toImportPath", () => {
  it("returns a file URL with a cache buster query", () => {
    const importPath = toImportPath("/tmp/file.ts");

    expect(importPath.startsWith("file:///tmp/file.ts")).toBe(true);
    expect(importPath.includes("?cache=")).toBe(true);
  });
});
