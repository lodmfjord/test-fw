/**
 * @fileoverview Tests toLambdaFunctions behavior.
 */
import { describe, expect, it } from "bun:test";
import { toLambdaFunctions } from "./to-lambda-functions";

describe("toLambdaFunctions", () => {
  it("maps lambda manifest functions sorted by route id", () => {
    const functions = toLambdaFunctions({
      lambdasManifest: {
        functions: [
          {
            architecture: "arm64",
            artifactPath: "b.zip",
            memoryMb: 256,
            method: "POST",
            path: "/b",
            routeId: "route_b",
            runtime: "nodejs20.x",
            timeoutSeconds: 15,
          },
          {
            architecture: "arm64",
            artifactPath: "a.zip",
            memoryMb: 128,
            method: "GET",
            path: "/a",
            routeId: "route_a",
            runtime: "nodejs20.x",
            timeoutSeconds: 10,
          },
        ],
      },
    } as never);

    expect(Object.keys(functions)).toEqual(["route_a", "route_b"]);
    expect(functions.route_a).toEqual({
      architecture: "arm64",
      artifact_path: "a.zip",
      memory_mb: 128,
      method: "GET",
      path: "/a",
      runtime: "nodejs20.x",
      timeout_seconds: 10,
    });
  });
});
