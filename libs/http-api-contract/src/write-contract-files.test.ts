import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "bun:test";
import { buildContract } from "./build-contract";
import { defineRoute } from "./define-route";
import { writeContractFiles } from "./write-contract-files";

describe("writeContractFiles", () => {
  it("writes contract files to disk", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "simple-api-contract-"));
    const contract = buildContract({
      apiName: "write-api",
      version: "0.1.0",
      routes: [
        defineRoute({
          method: "GET",
          path: "/health",
          handler: "src/health.ts#handler",
        }),
      ],
    });

    const writtenFiles = await writeContractFiles(outputDirectory, contract);
    expect(writtenFiles).toHaveLength(5);

    const openApiSource = await readFile(join(outputDirectory, "openapi.json"), "utf8");
    const openApi = JSON.parse(openApiSource) as { info?: { title?: string } };
    expect(openApi.info?.title).toBe("write-api");
  });
});
