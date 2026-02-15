/**
 * @fileoverview Tests writeContractFiles export behavior.
 */
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { writeContractFiles } from "./write-contract-files-export";

describe("writeContractFiles export", () => {
  it("writes contract json files through the export wrapper", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "write-contract-files-export-"));

    const fileNames = await writeContractFiles(outputDirectory, {
      deployContract: { apiGateway: {}, apiName: "demo" },
      envSchema: {},
      lambdasManifest: {},
      openapi: {},
      routesManifest: {},
    } as never);

    expect(fileNames).toContain("openapi.json");
    expect(await readFile(join(outputDirectory, "openapi.json"), "utf8")).toContain("{}");
  });

  it("throws when output directory is empty", async () => {
    await expect(writeContractFiles(" ", {} as never)).rejects.toThrow(
      "outputDirectory is required",
    );
  });
});
