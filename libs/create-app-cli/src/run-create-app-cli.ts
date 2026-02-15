/**
 * @fileoverview Runs CLI argument handling to scaffold a minimal app in apps/.
 */
import { createBaseApp } from "./create-base-app";

/**
 * Runs the create-app CLI.
 * @param args - CLI arguments where the first value is the target app name.
 * @param repoRoot - Absolute path to the repository root.
 * @example
 * ```ts
 * const exitCode = await runCreateAppCli(["hello-app"], process.cwd());
 * ```
 */
export async function runCreateAppCli(args: string[], repoRoot: string): Promise<number> {
  const [appName] = args;

  if (!appName) {
    console.error("Usage: create-babbstack-app <app-name>");
    return 1;
  }

  await createBaseApp(appName, repoRoot);
  console.log(`Created apps/${appName}`);
  return 0;
}
