/** @fileoverview Tests create dev app env. @module libs/http-api-contract/src/create-dev-app-env.test */
import { beforeEach, describe, expect, it } from "bun:test";
import { createDevApp } from "./create-dev-app";
import { createEnv } from "./create-env";
import { createSecret } from "./create-secret";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";
import { schema } from "@babbstack/schema";

describe("createDevApp env startup", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("sets plain env vars and logs secret loading hints on localhost", async () => {
    defineGet({
      env: [
        createEnv({
          APP_NAME: "dev-app",
          API_TOKEN: createSecret("/app/private/token"),
        }),
        {
          APP_NAME: "dev-app-v2",
        },
      ],
      path: "/env",
      handler: () => ({
        value: {
          appName: process.env.APP_NAME ?? "",
          apiToken: process.env.API_TOKEN ?? "",
        },
      }),
      response: schema.object({
        apiToken: schema.string(),
        appName: schema.string(),
      }),
    });

    const previousAppName = process.env.APP_NAME;
    const previousApiToken = process.env.API_TOKEN;
    delete process.env.APP_NAME;
    delete process.env.API_TOKEN;

    const logged: string[] = [];
    const originalConsoleLog = console.log;
    console.log = (...parts: unknown[]) => {
      logged.push(parts.map((part) => String(part)).join(" "));
    };

    const appFetch = createDevApp(listDefinedEndpoints());
    const response = await appFetch(new Request("http://local/env", { method: "GET" }));

    console.log = originalConsoleLog;
    if (previousAppName === undefined) delete process.env.APP_NAME;
    else process.env.APP_NAME = previousAppName;
    if (previousApiToken === undefined) delete process.env.API_TOKEN;
    else process.env.API_TOKEN = previousApiToken;

    expect(response.status).toBe(200);
    expect((await response.json()) as { apiToken: string; appName: string }).toEqual({
      apiToken: "",
      appName: "dev-app-v2",
    });
    expect(
      logged.some((entry) =>
        entry.includes("Would load parameter /app/private/token into API_TOKEN"),
      ),
    ).toBe(true);
  });

  it("uses local env fallback for secrets on localhost", async () => {
    defineGet({
      env: [
        createEnv({
          API_TOKEN: createSecret("/app/private/token", {
            localEnvName: "SECRET_BLE",
          }),
        }),
      ],
      path: "/env",
      handler: () => ({
        value: {
          apiToken: process.env.API_TOKEN ?? "",
        },
      }),
      response: schema.object({
        apiToken: schema.string(),
      }),
    });

    const previousApiToken = process.env.API_TOKEN;
    const previousSecretBle = process.env.SECRET_BLE;
    delete process.env.API_TOKEN;
    process.env.SECRET_BLE = "from-local-env";

    const appFetch = createDevApp(listDefinedEndpoints());
    const response = await appFetch(new Request("http://local/env", { method: "GET" }));

    if (previousApiToken === undefined) delete process.env.API_TOKEN;
    else process.env.API_TOKEN = previousApiToken;
    if (previousSecretBle === undefined) delete process.env.SECRET_BLE;
    else process.env.SECRET_BLE = previousSecretBle;

    expect(response.status).toBe(200);
    expect((await response.json()) as { apiToken: string }).toEqual({
      apiToken: "from-local-env",
    });
  });
});
