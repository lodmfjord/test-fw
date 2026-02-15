/**
 * @fileoverview Runs CLI argument handling to scaffold a minimal app in apps/.
 */
import { createLogger } from "@babbstack/logger";
import { createBaseApp } from "./create-base-app";

/**
 * Runs the create-app CLI.
 * @param args - CLI arguments where the first value is the target app name.
 * @param repoRoot - Absolute path to the repository root.
 * @example
 * ```ts
 * const exitCode = await runCreateAppCli(["hello-app"], process.cwd());
 * ```
 * @returns Output value.
 */
export async function runCreateAppCli(args: string[], repoRoot: string): Promise<number> {
  const [appName] = args;
  const logger = createLogger({
    serviceName: "create-app-cli",
  });

  if (!appName) {
    logger.error("Usage: create-babbstack-app <app-name>");
    return 1;
  }

  await createBaseApp(appName, repoRoot);
  logger.info(`Created apps/${appName}`);
  return 0;
}
