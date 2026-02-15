/**
 * @fileoverview Tests loadEndpointsFromModule behavior.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { loadEndpointsFromModule } from "./load-endpoints-from-module";

describe("loadEndpointsFromModule", () => {
  it("loads and flattens endpoint arrays from a module export", async () => {
    const fixtureDirectory = await mkdtemp(join(tmpdir(), "load-endpoints-"));
    const modulePath = join(fixtureDirectory, "endpoints.mjs");

    await writeFile(
      modulePath,
      `
const endpoint = {
  handler: () => ({ value: {} }),
  method: "GET",
  path: "/users",
  request: {},
  response: {},
  responseByStatusCode: { "200": {} },
  routeId: "get_users",
  successStatusCode: 200,
};

export const endpoints = [endpoint, [endpoint]];
`,
      "utf8",
    );

    const loaded = await loadEndpointsFromModule(modulePath, "endpoints");

    expect(loaded).toHaveLength(2);
    expect(loaded[0]?.routeId).toBe("get_users");
  });

  it("throws when export is missing", async () => {
    const fixtureDirectory = await mkdtemp(join(tmpdir(), "load-endpoints-"));
    const modulePath = join(fixtureDirectory, "endpoints.mjs");
    await writeFile(modulePath, "export const value = 1;\n", "utf8");

    await expect(loadEndpointsFromModule(modulePath, "endpoints")).rejects.toThrow(
      'Endpoint export "endpoints" was not found',
    );
  });
});
