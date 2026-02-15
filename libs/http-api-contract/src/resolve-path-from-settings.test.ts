/**
 * @fileoverview Tests resolvePathFromSettings behavior.
 */
import { describe, expect, it } from "bun:test";
import { resolvePathFromSettings } from "./resolve-path-from-settings";

describe("resolvePathFromSettings", () => {
  it("resolves relative paths from settings directory", () => {
    const resolved = resolvePathFromSettings("./config.json", "/tmp/demo");

    expect(resolved).toContain("/tmp/demo/config.json");
  });

  it("keeps absolute paths unchanged", () => {
    expect(resolvePathFromSettings("/tmp/absolute.json", "/tmp/demo")).toBe("/tmp/absolute.json");
  });
});
