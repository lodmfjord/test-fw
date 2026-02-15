/**
 * @fileoverview Tests initializeEndpointEnv behavior.
 */
import { describe, expect, it } from "bun:test";
import { createSecret } from "./create-secret";
import { initializeEndpointEnv } from "./initialize-endpoint-env";

describe("initializeEndpointEnv", () => {
  it("loads plain env vars and local secret fallbacks", () => {
    const previousPlain = process.env.PLAIN_KEY;
    const previousMapped = process.env.SIMPLE_API_TEST_ENV_SECRET;

    process.env.SIMPLE_API_TEST_ENV_SECRET = "mapped-secret";

    initializeEndpointEnv([
      {
        env: {
          PLAIN_KEY: "plain-value",
          SECRET_KEY: createSecret("/simple-api/test/secret", {
            localEnvName: "SIMPLE_API_TEST_ENV_SECRET",
          }),
        },
      } as never,
    ]);

    expect(process.env.PLAIN_KEY).toBe("plain-value");
    expect(process.env.SECRET_KEY).toBe("mapped-secret");

    if (previousPlain === undefined) {
      delete process.env.PLAIN_KEY;
    } else {
      process.env.PLAIN_KEY = previousPlain;
    }

    if (previousMapped === undefined) {
      delete process.env.SIMPLE_API_TEST_ENV_SECRET;
    } else {
      process.env.SIMPLE_API_TEST_ENV_SECRET = previousMapped;
    }

    delete process.env.SECRET_KEY;
  });
});
