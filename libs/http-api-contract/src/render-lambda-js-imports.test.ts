/**
 * @fileoverview Tests render lambda js imports.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderLambdaJsFiles } from "./render-lambda-js-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { schema } from "@babbstack/schema";

describe("renderLambdaJsFiles imports", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("renders lambda entry source with framework and endpoint imports", () => {
    defineGet({
      path: "/health",
      handler: () => ({ value: { status: "ok" } }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    const files = renderLambdaJsFiles(listDefinedEndpoints(), {
      endpointModulePath: "apps/test-app/src/endpoints.ts",
    });
    const source = files["get_health.mjs"];

    expect(
      source?.includes('import { listDefinedEndpoints } from "@babbstack/http-api-contract";'),
    ).toBe(true);
    expect(source?.includes('await import("apps/test-app/src/endpoints.ts")')).toBe(true);
    expect(source?.includes("export async function handler")).toBe(true);
  });
});
