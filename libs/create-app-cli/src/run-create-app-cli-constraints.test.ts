/**
 * @fileoverview Verifies scaffolded apps satisfy repository constraints.
 */
import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, test } from "bun:test";
import { runCreateAppCli } from "./run-create-app-cli";

type ExecFileError = Error & {
  stderr?: string;
  stdout?: string;
};

const execFileAsync = promisify(execFile);
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

test("generated app passes check:constraints", async () => {
  const appName = `constraints-fixture-${Date.now().toString(36)}`;
  const appRoot = join(repoRoot, "apps", appName);

  try {
    const exitCode = await runCreateAppCli([appName], repoRoot);
    expect(exitCode).toBe(0);

    let checkOutput = "";
    try {
      const commandResult = await execFileAsync("bun", ["run", "check:constraints"], {
        cwd: repoRoot,
      });
      checkOutput = `${commandResult.stdout}${commandResult.stderr}`;
    } catch (error) {
      const commandError = error as ExecFileError;
      checkOutput = `${commandError.stdout ?? ""}${commandError.stderr ?? ""}`;
    }

    expect(checkOutput).not.toContain(`apps/${appName}/`);
  } finally {
    await rm(appRoot, {
      recursive: true,
      force: true,
    });
  }
});
