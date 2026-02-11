import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { writeLambdaLayerArtifacts } from "./write-lambda-layer-artifacts";

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
});
