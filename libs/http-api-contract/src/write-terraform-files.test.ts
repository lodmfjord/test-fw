/**
 * @fileoverview Tests writeTerraformFiles behavior.
 */
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { writeTerraformFiles } from "./write-terraform-files";

describe("writeTerraformFiles", () => {
  it("writes sorted files and removes legacy main.tf.json when absent", async () => {
    const directory = await mkdtemp(join(tmpdir(), "write-terraform-files-"));
    await writeFile(join(directory, "main.tf.json"), "legacy", "utf8");

    const written = await writeTerraformFiles(directory, {
      "api.tf.json": "api",
      "provider.tf.json": "provider",
    });

    expect(written).toEqual(["api.tf.json", "provider.tf.json"]);
    expect(await readFile(join(directory, "api.tf.json"), "utf8")).toBe("api");
    await expect(readFile(join(directory, "main.tf.json"), "utf8")).rejects.toThrow();
  });

  it("throws when output directory is empty", async () => {
    await expect(writeTerraformFiles(" ", {})).rejects.toThrow(
      "terraform outputDirectory is required",
    );
  });
});
