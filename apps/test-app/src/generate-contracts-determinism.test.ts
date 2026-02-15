/**
 * @fileoverview Tests generate contracts determinism.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { expect, test } from "bun:test";

const APP_DIRECTORY = dirname(import.meta.dir);

/** Runs read json file. */ async function readJsonFile(
  pathFromAppDirectory: string,
): Promise<unknown> {
  const source = await readFile(join(APP_DIRECTORY, pathFromAppDirectory), "utf8");
  return JSON.parse(source) as unknown;
}

test("generate:contracts script is deterministic from a clean checkout", async () => {
  const appPackageJson = (await readJsonFile("package.json")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
  };
  const settings = (await readJsonFile("babb.settings.json")) as {
    externalModules?: unknown;
  };

  expect(appPackageJson.scripts?.["generate:contracts"]).toContain(
    "bun run --cwd ../.. build:libs",
  );

  const externalModules = Array.isArray(settings.externalModules) ? settings.externalModules : [];
  for (const moduleName of externalModules) {
    if (typeof moduleName !== "string") {
      continue;
    }

    expect(appPackageJson.dependencies?.[moduleName]).toBeDefined();
  }
});
