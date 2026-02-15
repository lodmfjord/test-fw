/** @fileoverview Implements create fake layer modules for test. @module libs/http-api-contract/src/create-fake-layer-modules-for-test */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Handles write fake module. */
async function writeFakeModule(
  nodeModulesDirectory: string,
  moduleName: string,
  dependencies: Record<string, string>,
  exportName: string,
): Promise<void> {
  await mkdir(join(nodeModulesDirectory, moduleName), { recursive: true });
  await writeFile(
    join(nodeModulesDirectory, moduleName, "package.json"),
    JSON.stringify(
      {
        dependencies,
        main: "index.js",
        name: moduleName,
        version: "1.0.0",
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeFile(
    join(nodeModulesDirectory, moduleName, "index.js"),
    `export const ${exportName} = "${exportName}";\n`,
    "utf8",
  );
}

/** Creates fake layer modules for test. @example `await createFakeLayerModulesForTest(input)` */
export async function createFakeLayerModulesForTest(workspaceDirectory: string): Promise<void> {
  const nodeModulesDirectory = join(workspaceDirectory, "node_modules");
  await writeFakeModule(nodeModulesDirectory, "zod", {}, "z");
  await writeFakeModule(nodeModulesDirectory, "fake-layer-shared", {}, "shared");
  await writeFakeModule(
    nodeModulesDirectory,
    "fake-layer-one",
    {
      "fake-layer-shared": "1.0.0",
    },
    "one",
  );
  await writeFakeModule(
    nodeModulesDirectory,
    "fake-layer-two",
    {
      "fake-layer-shared": "1.0.0",
    },
    "two",
  );
}
