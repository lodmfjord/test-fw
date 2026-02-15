/** @fileoverview Tests render contract files. @module libs/http-api-contract/src/render-contract-files.test */
import { describe, expect, it } from "bun:test";
import { buildContract } from "./build-contract";
import { defineRoute } from "./define-route";
import { renderContractFiles } from "./render-contract-files";

describe("renderContractFiles", () => {
  it("renders all contract files", () => {
    const contract = buildContract({
      apiName: "render-api",
      version: "0.1.0",
      routes: [
        defineRoute({
          method: "GET",
          path: "/health",
          handler: "src/health.ts#handler",
        }),
      ],
    });

    const files = renderContractFiles(contract);

    expect(Object.keys(files).sort()).toEqual([
      "deploy.contract.json",
      "env.schema.json",
      "lambdas.manifest.json",
      "openapi.json",
      "routes.manifest.json",
    ]);

    const openapi = JSON.parse(files["openapi.json"] ?? "{}");
    expect(openapi.openapi).toBe("3.1.0");
  });
});
