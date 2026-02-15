/**
 * @fileoverview Tests package exports consistency.
 */
import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

type LibraryPackageJson = {
  exports?: {
    "."?: {
      bun?: string;
      default?: string;
      types?: string;
    };
  };
  name?: string;
};

const EXPECTED_EXPORTS = {
  bun: "./dist/index.js",
  default: "./dist/index.js",
  types: "./dist/index.d.ts",
};

/** Handles read library package paths. */ async function readLibraryPackagePaths(): Promise<
  string[]
> {
  const librariesDirectory = join(import.meta.dir, "..", "..", "libs");
  const entries = await readdir(librariesDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(librariesDirectory, entry.name, "package.json"))
    .sort((left, right) => left.localeCompare(right));
}

describe("library package exports", () => {
  it("keeps bun, types, and default export targets consistent across libs", async () => {
    const packagePaths = await readLibraryPackagePaths();

    for (const packagePath of packagePaths) {
      const source = await readFile(packagePath, "utf8");
      const packageJson = JSON.parse(source) as LibraryPackageJson;
      expect(packageJson.exports?.["."]).toEqual(EXPECTED_EXPORTS);
    }
  });
});
