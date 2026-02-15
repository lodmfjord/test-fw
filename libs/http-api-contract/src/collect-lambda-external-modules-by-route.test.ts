/**
 * @fileoverview Tests collectLambdaExternalModulesByRoute behavior.
 */
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";
import { collectLambdaExternalModulesByRoute } from "./collect-lambda-external-modules-by-route";

describe("collectLambdaExternalModulesByRoute", () => {
  it("detects configured and required runtime modules used per route", async () => {
    const root = await mkdtemp(join(tmpdir(), "collect-lambda-modules-"));

    await writeFile(join(root, "route-a.mjs"), 'import "zod";\nimport "aws-sdk";\n', "utf8");
    await writeFile(join(root, "route-b.mjs"), 'console.log("no imports");\n', "utf8");

    const byRoute = await collectLambdaExternalModulesByRoute(
      root,
      ["route-a.mjs", "route-b.mjs"],
      ["aws-sdk"],
      import.meta.url,
    );

    expect(byRoute["route-a"]).toEqual(["aws-sdk", "zod"]);
    expect(byRoute["route-b"]).toBeUndefined();
  });
});
