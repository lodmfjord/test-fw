import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "bun:test";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { writeLambdaJsFiles } from "./write-lambda-js-files";

describe("writeLambdaJsFiles", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("writes bundled lambda js files to disk", async () => {
    const endpointModuleDirectory = await mkdtemp(join(tmpdir(), "simple-api-endpoint-module-"));
    const endpointModulePath = join(endpointModuleDirectory, "endpoints.ts");
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    await writeFile(
      endpointModulePath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/health",
  handler: () => ({ status: "ok" }),
  response: schema.object({
    status: schema.string(),
  }),
});
`,
      "utf8",
    );

    await import(pathToFileURL(endpointModulePath).href);
    const outputDirectory = await mkdtemp(join(tmpdir(), "simple-api-lambda-js-"));
    const fileNames = await writeLambdaJsFiles(outputDirectory, listDefinedEndpoints(), {
      endpointModulePath,
      frameworkImportPath,
    });

    expect(fileNames).toEqual(["get_health.mjs"]);

    const source = await readFile(join(outputDirectory, "get_health.mjs"), "utf8");
    expect(/^\s*import\s/m.test(source)).toBe(false);
    expect(source.includes("Handler execution failed")).toBe(true);
    expect(source.includes("export")).toBe(true);
  });
});
