/**
 * @fileoverview Tests render terraform files cors.
 */
import { beforeEach, describe, expect, it } from "bun:test";
import { schema } from "@babbstack/schema";
import { buildContractFromEndpoints } from "./build-contract-from-endpoints";
import { defineGet } from "./define-get";
import { listDefinedEndpoints } from "./list-defined-endpoints";
import { renderTerraformFiles } from "./render-terraform-files";
import { resetDefinedEndpoints } from "./reset-defined-endpoints";

describe("renderTerraformFiles cors", () => {
  beforeEach(() => {
    resetDefinedEndpoints();
  });

  it("renders api gateway cors configuration from global contract cors", () => {
    defineGet({
      path: "/users",
      handler: () => ({
        value: {
          ok: true,
        },
      }),
      response: schema.object({
        ok: schema.boolean(),
      }),
    });

    const endpoints = listDefinedEndpoints();
    const contract = buildContractFromEndpoints({
      apiName: "terraform-cors-test",
      cors: {
        allowCredentials: true,
        allowHeaders: ["authorization", "content-type"],
        allowOrigin: "https://app.example.com",
        exposeHeaders: ["x-request-id"],
        maxAgeSeconds: 600,
      },
      endpoints,
      version: "1.0.0",
    });
    const files = renderTerraformFiles(contract, endpoints, [], {
      appName: "test-app",
      prefix: "",
      region: "eu-west-1",
      resources: {
        apiGateway: true,
        dynamodb: false,
        lambdas: false,
        sqs: false,
      },
    });
    const apiGatewaySource = files["api-gateway.tf.json"] ?? "";

    expect(apiGatewaySource.includes('"cors_configuration"')).toBe(true);
    expect(apiGatewaySource.includes('"allow_credentials": true')).toBe(true);
    expect(apiGatewaySource.includes('"allow_origins": [')).toBe(true);
    expect(apiGatewaySource.includes('"https://app.example.com"')).toBe(true);
    expect(apiGatewaySource.includes('"allow_methods": [')).toBe(true);
    expect(apiGatewaySource.includes('"OPTIONS"')).toBe(true);
  });
});
