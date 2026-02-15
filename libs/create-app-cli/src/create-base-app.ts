/**
 * @fileoverview Creates a minimal Bun app scaffold with a compliant hello-world entrypoint.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Creates a minimal app folder structure at `apps/<appName>`.
 * @param appName - The app folder and package name to create.
 * @param repoRoot - Absolute path to the repository root where `apps/` lives.
 * @example
 * ```ts
 * await createBaseApp("hello-app", "/workspace/test-fw");
 * ```
 */
export async function createBaseApp(appName: string, repoRoot: string): Promise<void> {
  const appRoot = join(repoRoot, "apps", appName);
  const srcRoot = join(appRoot, "src");

  await mkdir(srcRoot, { recursive: true });

  await writeFile(
    join(appRoot, "package.json"),
    `${JSON.stringify(
      {
        name: appName,
        private: true,
        type: "module",
        scripts: {
          dev: "bun src/app-bin.ts",
        },
        dependencies: {
          "@aws-lambda-powertools/logger": "^2.31.0",
        },
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  await writeFile(
    join(appRoot, "README.md"),
    `# ${appName}\n\nMinimal generated app created by @babbstack/create-app-cli.\n`,
    "utf8",
  );

  await writeFile(
    join(srcRoot, "app-bin.ts"),
    [
      "/**",
      " * @fileoverview Runs the hello-world entrypoint for the generated app.",
      " */",
      'console.log("Hello world");',
      "",
    ].join("\n"),
    "utf8",
  );
}
