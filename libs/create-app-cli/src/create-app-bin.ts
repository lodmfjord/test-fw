#!/usr/bin/env bun
/**
 * @fileoverview Provides an executable CLI entrypoint for app scaffolding.
 */
import { runCreateAppCli } from "./run-create-app-cli";

/**
 * Executes the CLI process and sets the process exit code.
 */
async function main(): Promise<void> {
  const exitCode = await runCreateAppCli(process.argv.slice(2), process.cwd());
  process.exitCode = exitCode;
}

main();
