/**
 * @fileoverview Tests the create-app CLI behavior for generating a minimal hello-world app.
 */
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";
import { runCreateAppCli } from "./run-create-app-cli";

describe("runCreateAppCli", () => {
  test("creates an app under apps/<name> with hello world boilerplate", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "create-app-cli-"));

    const exitCode = await runCreateAppCli(["hello-app"], tempRoot);

    const appPackageJson = await readFile(
      join(tempRoot, "apps", "hello-app", "package.json"),
      "utf8",
    );
    const appIndex = await readFile(join(tempRoot, "apps", "hello-app", "src", "index.ts"), "utf8");

    expect(exitCode).toBe(0);
    expect(appPackageJson).toContain('"name": "hello-app"');
    expect(appIndex).toContain('console.log("Hello world");');
  });
});
