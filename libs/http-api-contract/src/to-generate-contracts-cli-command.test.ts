/** @fileoverview Tests to generate contracts cli command. @module libs/http-api-contract/src/to-generate-contracts-cli-command.test */
import { describe, expect, it } from "bun:test";
import { toGenerateContractsCliCommand } from "./to-generate-contracts-cli-command";

describe("toGenerateContractsCliCommand", () => {
  it("defaults to generate babb.settings.json when no args are provided", () => {
    expect(toGenerateContractsCliCommand([])).toEqual({
      kind: "generate",
      settingsFilePath: "babb.settings.json",
    });
  });

  it("supports init command with default settings path", () => {
    expect(toGenerateContractsCliCommand(["init"])).toEqual({
      kind: "init",
      settingsFilePath: "babb.settings.json",
    });
  });

  it("supports direct settings path for generate", () => {
    expect(toGenerateContractsCliCommand(["./custom.settings.jsonc"])).toEqual({
      kind: "generate",
      settingsFilePath: "./custom.settings.jsonc",
    });
  });

  it("supports settings flag for generate and init", () => {
    expect(toGenerateContractsCliCommand(["--settings", "./custom-a.settings.jsonc"])).toEqual({
      kind: "generate",
      settingsFilePath: "./custom-a.settings.jsonc",
    });
    expect(
      toGenerateContractsCliCommand(["init", "--settings", "./custom-b.settings.jsonc"]),
    ).toEqual({
      kind: "init",
      settingsFilePath: "./custom-b.settings.jsonc",
    });
  });

  it("throws when settings flag is provided without a value", () => {
    expect(() => toGenerateContractsCliCommand(["--settings"])).toThrow(
      'Missing value for "--settings"',
    );
  });
});
