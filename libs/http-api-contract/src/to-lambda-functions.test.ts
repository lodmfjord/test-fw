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
            method: "POST",
            path: "/b",
            routeId: "route_b",
            runtime: "nodejs20.x",
          },
          {
            architecture: "arm64",
            artifactPath: "a.zip",
            ephemeralStorageMb: 2048,
            memoryMb: 128,
            method: "GET",
            path: "/a",
            reservedConcurrency: 3,
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
      ephemeral_storage_mb: 2048,
      memory_mb: 128,
      method: "GET",
      path: "/a",
      reserved_concurrency: 3,
      runtime: "nodejs20.x",
      timeout_seconds: 10,
    });
    expect(functions.route_b).toEqual({
      architecture: "arm64",
      artifact_path: "b.zip",
      method: "POST",
      path: "/b",
      runtime: "nodejs20.x",
    });
  });
});
