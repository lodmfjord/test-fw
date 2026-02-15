/**
 * @fileoverview Tests write lambda layer artifacts.
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "bun:test";
import { createFakeLayerModulesForTest } from "./create-fake-layer-modules-for-test";
import { writeLambdaLayerArtifacts } from "./write-lambda-layer-artifacts";

const execFileAsync = promisify(execFile);

describe("writeLambdaLayerArtifacts", () => {
  it("throws when external modules are not installed in the app workspace", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-layer-artifacts-"));
    const outputDirectory = join(workspaceDirectory, "layer-artifacts");

    await expect(
      writeLambdaLayerArtifacts(
        outputDirectory,
        {
          layersByKey: {
            layer_missing: {
              artifact_file: "layer_missing.zip",
              module_names: ["fake-layer-module-not-installed"],
            },
          },
          routeLayerKeyByRoute: {
            get_health: "layer_missing",
          },
        },
        workspaceDirectory,
      ),
    ).rejects.toThrow('Cannot resolve external module "fake-layer-module-not-installed"');
  });

  it("creates non-empty layer zip that contains requested modules", async () => {
    const workspaceDirectory = await mkdtemp(join(tmpdir(), "babbstack-layer-artifacts-"));
    const outputDirectory = join(workspaceDirectory, "layer-artifacts");
    await createFakeLayerModulesForTest(workspaceDirectory);

    const artifacts = await writeLambdaLayerArtifacts(
      outputDirectory,
      {
        layersByKey: {
          layer_fake: {
            artifact_file: "layer_fake.zip",
            module_names: ["fake-layer-one", "fake-layer-two"],
          },
        },
        routeLayerKeyByRoute: {
          get_health: "layer_fake",
        },
      },
      workspaceDirectory,
    );

    expect(artifacts).toEqual(["layer_fake.zip"]);
    const zipFilePath = join(outputDirectory, "layer_fake.zip");
    const listing = await execFileAsync("unzip", ["-l", zipFilePath]);
    const hashManifest = JSON.parse(
      await readFile(join(outputDirectory, "source-code-hashes.json"), "utf8"),
    ) as Record<string, string>;

    expect(listing.stdout.includes("nodejs/node_modules/fake-layer-one/index.js")).toBe(true);
    expect(listing.stdout.includes("nodejs/node_modules/fake-layer-two/index.js")).toBe(true);
    expect(listing.stdout.includes("nodejs/node_modules/fake-layer-shared/index.js")).toBe(true);
    expect(typeof hashManifest.layer_fake).toBe("string");
    expect((hashManifest.layer_fake ?? "").length > 0).toBe(true);
  });
});
