/**
 * @fileoverview Tests render lambda js files.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { defineGet } from "./define-get";
import { definePost } from "./define-post";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderLambdaJsFiles } from "./render-lambda-js-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { schema } from "@babbstack/schema";

describe("renderLambdaJsFiles", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("renders one js lambda file per endpoint", () => {
    defineGet({
      path: "/health",
      handler: () => ({ value: { status: "ok" } }),
      response: schema.object({
        status: schema.string(),
      }),
    });

    definePost({
      path: "/users",
      handler: ({ body }) => ({ value: { id: `user-${body.name}` } }),
      request: {
        body: schema.object({
          name: schema.string(),
        }),
      },
      response: schema.object({
        id: schema.string(),
      }),
    });

    const files = renderLambdaJsFiles(listDefinedEndpoints(), {
      endpointModulePath: "/tmp/endpoints.ts",
    });

    expect(Object.keys(files).sort()).toEqual(["get_health.mjs", "post_users.mjs"]);
    expect(files["get_health.mjs"]?.includes('await import("/tmp/endpoints.ts")')).toBe(true);
    expect(files["get_health.mjs"]?.includes("export async function handler")).toBe(true);
    expect(files["get_health.mjs"]?.includes("import ")).toBe(true);
    expect(
      files["post_users.mjs"]?.includes(
        "const handlerOutput = toHandlerOutput(output, endpointSuccessStatusCode);",
      ),
    ).toBe(true);
  });
});
