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
    const indexSource = await readFile(join(root, "apps", "demo-app", "src", "index.ts"), "utf8");

    expect(packageJson).toContain('"name": "demo-app"');
    expect(readme).toContain("Minimal generated app");
    expect(indexSource).toContain('console.log("Hello world")');
  });
});
