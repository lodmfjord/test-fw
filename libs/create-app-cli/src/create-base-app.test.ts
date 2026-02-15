/**
 * @fileoverview Tests createBaseApp behavior.
 */
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { createBaseApp } from "./create-base-app";

describe("createBaseApp", () => {
  it("creates minimal hello-world app files", async () => {
    const root = await mkdtemp(join(tmpdir(), "create-base-app-"));

    await createBaseApp("demo-app", root);

    const packageJson = await readFile(join(root, "apps", "demo-app", "package.json"), "utf8");
    const readme = await readFile(join(root, "apps", "demo-app", "README.md"), "utf8");
    const appBinSource = await readFile(
      join(root, "apps", "demo-app", "src", "app-bin.ts"),
      "utf8",
    );

    expect(packageJson).toContain('"name": "demo-app"');
    expect(packageJson).toContain('"dev": "bun src/app-bin.ts"');
    expect(packageJson).toContain('"@aws-lambda-powertools/logger"');
    expect(readme).toContain("Minimal generated app");
    expect(appBinSource).toContain('console.log("Hello world");');
  });
});
