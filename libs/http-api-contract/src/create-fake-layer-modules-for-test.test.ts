/**
 * @fileoverview Tests createFakeLayerModulesForTest behavior.
 */
import { describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFakeLayerModulesForTest } from "./create-fake-layer-modules-for-test";

describe("createFakeLayerModulesForTest", () => {
  it("creates fake modules with expected package metadata and exports", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "simple-api-fake-layers-"));

    try {
      await createFakeLayerModulesForTest(workspaceDirectory);

      const onePackage = JSON.parse(
        await readFile(
          join(workspaceDirectory, "node_modules", "fake-layer-one", "package.json"),
          "utf8",
        ),
      ) as {
        dependencies?: Record<string, string>;
      };
      const twoIndex = await readFile(
        join(workspaceDirectory, "node_modules", "fake-layer-two", "index.js"),
        "utf8",
      );
      const zodPackageText = await readFile(
        join(workspaceDirectory, "node_modules", "zod", "package.json"),
        "utf8",
      );
      const loggerPackageText = await readFile(
        join(
          workspaceDirectory,
          "node_modules",
          "@aws-lambda-powertools",
          "logger",
          "package.json",
        ),
        "utf8",
      );

      expect(onePackage.dependencies).toEqual({ "fake-layer-shared": "1.0.0" });
      expect(twoIndex).toContain('export const two = "two";');
      expect(zodPackageText).toContain('"name": "zod"');
      expect(loggerPackageText).toContain('"name": "@aws-lambda-powertools/logger"');
    } finally {
      await rm(workspaceDirectory, { force: true, recursive: true });
    }
  });
});
