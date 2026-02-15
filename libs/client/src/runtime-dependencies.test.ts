/**
 * @fileoverview Verifies the client package runtime dependency surface.
 */
import { describe, expect, it } from "bun:test";

type PackageJson = {
  dependencies?: Record<string, string>;
};

describe("@babbstack/client package dependencies", () => {
  it("does not include http-api-contract as a runtime dependency", async () => {
    const packageJson = (await Bun.file(
      new URL("../package.json", import.meta.url),
    ).json()) as PackageJson;

    expect(packageJson.dependencies?.["@babbstack/http-api-contract"]).toBeUndefined();
  });
});
