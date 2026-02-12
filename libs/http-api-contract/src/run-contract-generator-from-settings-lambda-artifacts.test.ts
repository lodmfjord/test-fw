import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { beforeEach, describe, expect, it } from "bun:test";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { runContractGeneratorFromSettings } from "./run-contract-generator-from-settings";

const execFileAsync = promisify(execFile);

describe("runContractGeneratorFromSettings lambda artifacts", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("creates lambda zip artifacts for terraform lambda resources", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-generator-settings-"));
    const frameworkImportPath = fileURLToPath(new URL("./index.ts", import.meta.url));
    const endpointsPath = join(workspaceDirectory, "endpoints.ts");
    const contractPath = join(workspaceDirectory, "contract.ts");
    const settingsPath = join(workspaceDirectory, "settings.json");
    await writeFile(
      endpointsPath,
      `
import { defineGet, schema } from "${frameworkImportPath}";

defineGet({
  path: "/health",
  handler: () => ({
    value: {
      status: "ok",
    },
  }),
  response: schema.object({
    status: schema.string(),
  }),
});
`,
      "utf8",
    );
    await writeFile(
      contractPath,
      `
import { buildContractFromEndpoints, listDefinedEndpoints } from "${frameworkImportPath}";
import "./endpoints";

export const contract = buildContractFromEndpoints({
  apiName: "settings-test-api",
  version: "1.0.0",
  endpoints: listDefinedEndpoints(),
});
`,
      "utf8",
    );
    await writeFile(
      settingsPath,
      JSON.stringify(
        {
          appName: "test-app",
          contractExportName: "contract",
          contractModulePath: "./contract.ts",
          contractsOutputDirectory: "./dist/contracts",
          endpointModulePath: "./endpoints.ts",
          lambdaOutputDirectory: "./dist/lambda-js",
          prefix: "babbstack",
          terraform: {
            enabled: true,
            outputDirectory: "./dist/terraform",
            region: "eu-west-1",
            resources: {
              apiGateway: false,
              dynamodb: false,
              lambdas: true,
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    await runContractGeneratorFromSettings(settingsPath);
    const artifactsDirectory = join(workspaceDirectory, "dist/terraform/lambda-artifacts");
    const artifacts = (await readdir(artifactsDirectory)).sort((left, right) =>
      left.localeCompare(right),
    );
    expect(artifacts).toEqual(["get_health.zip", "source-code-hashes.json"]);

    const listing = await execFileAsync("unzip", [
      "-l",
      join(artifactsDirectory, "get_health.zip"),
    ]);
    expect(listing.stdout.includes("index.mjs")).toBe(true);

    const lambdaSource = await readFile(join(workspaceDirectory, "dist/lambda-js/get_health.mjs"));
    const expectedHash = createHash("sha256").update(lambdaSource).digest("base64");
    const hashManifest = JSON.parse(
      await readFile(join(artifactsDirectory, "source-code-hashes.json"), "utf8"),
    ) as Record<string, string>;
    expect(hashManifest.get_health).toBe(expectedHash);
  });
});
