import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { parseJsonc } from "./parse-jsonc";
import { writeDefaultGeneratorSettingsFile } from "./write-default-generator-settings-file";

describe("writeDefaultGeneratorSettingsFile", () => {
  it("creates a commented JSONC template file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "babbstack-default-settings-"));
    const settingsPath = join(directory, "babb.settings.json");

    await writeDefaultGeneratorSettingsFile(settingsPath);

    const source = await readFile(settingsPath, "utf8");
    expect(source.includes("//")).toBe(true);
    const parsed = parseJsonc(source) as {
      contractModulePath?: string;
      endpointExportName?: string;
      endpointModulePath?: string;
      lambdaOutputDirectory?: string;
    };
    expect(parsed.contractModulePath).toBe("./src/contract.ts");
    expect(parsed.endpointExportName).toBe("endpoints");
    expect(parsed.endpointModulePath).toBe("./src/endpoints.ts");
    expect(parsed.lambdaOutputDirectory).toBe("./dist/lambda-js");
  });

  it("fails when the settings file already exists", async () => {
    const directory = await mkdtemp(join(tmpdir(), "babbstack-default-settings-"));
    const settingsPath = join(directory, "babb.settings.json");

    await writeDefaultGeneratorSettingsFile(settingsPath);
    await expect(writeDefaultGeneratorSettingsFile(settingsPath)).rejects.toThrow(
      "Settings file already exists",
    );
  });
});
