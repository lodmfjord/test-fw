import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "bun:test";
import {
  listDefinedEndpoints,
  resetDefinedEndpoints,
  writeLambdaJsFiles,
} from "@simple-api/http-api-contract";

type LambdaLikeEvent = {
  body?: string;
  headers?: Record<string, string>;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
};

type LambdaLikeResponse = {
  body: string;
  headers: Record<string, string>;
  statusCode: number;
};

type EndpointExecutionCase = {
  event: LambdaLikeEvent;
  expectedBody: unknown;
};

function getHandlerFromSource(
  source: string,
): (event: LambdaLikeEvent) => Promise<LambdaLikeResponse> {
  if (/^\s*import\s/m.test(source)) {
    throw new Error("Imports are forbidden in enclosed lambda runtime");
  }

  if (/\brequire\s*\(/.test(source)) {
    throw new Error("require() is forbidden in enclosed lambda runtime");
  }

  const transformedSource = source
    .replace(/export\s+async\s+function\s+handler\s*\(/, "async function handler(")
    .replace(/export\s*\{\s*handler\s*\};?/g, "");

  const factory = new Function(
    `"use strict";
const require = undefined;
const process = undefined;
const Bun = undefined;
${transformedSource}
return handler;`,
  ) as () => (event: LambdaLikeEvent) => Promise<LambdaLikeResponse>;

  return factory();
}

function getEndpointExecutionCases(): Record<string, EndpointExecutionCase> {
  return {
    get_health: {
      event: {
        body: "",
        headers: {},
        pathParameters: {},
        queryStringParameters: {},
      },
      expectedBody: {
        status: "ok",
      },
    },
    get_hello_world: {
      event: {
        body: "",
        headers: {},
        pathParameters: {},
        queryStringParameters: {},
      },
      expectedBody: {
        hello: "hello-world-from-package",
      },
    },
    post_users: {
      event: {
        body: JSON.stringify({
          name: "sam",
        }),
        headers: {
          "content-type": "application/json",
        },
        pathParameters: {},
        queryStringParameters: {},
      },
      expectedBody: {
        id: "user-sam",
      },
    },
    get_test_db_one_param_id: {
      event: {
        body: "",
        headers: {},
        pathParameters: {
          id: "alpha",
        },
        queryStringParameters: {},
      },
      expectedBody: {
        id: "alpha",
        name: "test-db-one-alpha",
        points: 0,
      },
    },
    patch_test_db_one_param_id: {
      event: {
        body: JSON.stringify({
          name: "test-db-one-alpha-updated",
          points: 10,
        }),
        headers: {
          "content-type": "application/json",
        },
        pathParameters: {
          id: "alpha",
        },
        queryStringParameters: {},
      },
      expectedBody: {
        id: "alpha",
        name: "test-db-one-alpha-updated",
        points: 10,
      },
    },
    get_test_db_two_param_id: {
      event: {
        body: "",
        headers: {},
        pathParameters: {
          id: "bravo",
        },
        queryStringParameters: {},
      },
      expectedBody: {
        enabled: false,
        id: "bravo",
        title: "test-db-two-bravo",
      },
    },
    patch_test_db_two_param_id: {
      event: {
        body: JSON.stringify({
          enabled: true,
          title: "test-db-two-bravo-updated",
        }),
        headers: {
          "content-type": "application/json",
        },
        pathParameters: {
          id: "bravo",
        },
        queryStringParameters: {},
      },
      expectedBody: {
        enabled: true,
        id: "bravo",
        title: "test-db-two-bravo-updated",
      },
    },
  };
}

describe("generated lambda bundle", () => {
  it("executes every generated endpoint lambda in enclosed runtime", async () => {
    resetDefinedEndpoints();
    const endpointModulePath = fileURLToPath(new URL("./endpoints.ts", import.meta.url));
    await import(`./endpoints?test=${Date.now()}`);

    const outputDirectory = await mkdtemp(join(tmpdir(), "test-app-lambda-bundle-"));
    const fileNames = await writeLambdaJsFiles(outputDirectory, listDefinedEndpoints(), {
      endpointModulePath,
    });
    const executionCases = getEndpointExecutionCases();

    expect(fileNames).toEqual([
      "get_health.mjs",
      "get_hello_world.mjs",
      "get_test_db_one_param_id.mjs",
      "get_test_db_two_param_id.mjs",
      "patch_test_db_one_param_id.mjs",
      "patch_test_db_two_param_id.mjs",
      "post_users.mjs",
    ]);

    for (const fileName of fileNames) {
      const routeId = fileName.replace(/\.mjs$/, "");
      const executionCase = executionCases[routeId];
      expect(executionCase).toBeDefined();
      if (!executionCase) {
        continue;
      }

      const source = await readFile(join(outputDirectory, fileName), "utf8");
      if (routeId === "get_health") {
        expect(source.includes("defineRoute")).toBe(false);
        expect(source.includes("endpointRegistry")).toBe(false);
        expect(source.includes("slugify")).toBe(false);
        expect(source.split("\n").length).toBeLessThan(320);
      }
      const handler = getHandlerFromSource(source);
      const response = await handler(executionCase.event);

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/json");
      expect(JSON.parse(response.body)).toEqual(executionCase.expectedBody);
    }
  });
});
