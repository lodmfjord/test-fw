/**
 * @fileoverview Tests toLambdaLayerMetadata behavior.
 */
import { describe, expect, it } from "bun:test";
import { toLambdaLayerMetadata } from "./to-lambda-layer-metadata";

describe("toLambdaLayerMetadata", () => {
  it("deduplicates layers by module signature", () => {
    const metadata = toLambdaLayerMetadata({
      routeA: ["zod", "aws-sdk"],
      routeB: ["aws-sdk", "zod"],
      routeC: ["zod", "uuid"],
    });

    expect(Object.keys(metadata.layersByKey)).toHaveLength(2);
    expect(metadata.routeLayerKeyByRoute.routeA).toBe(metadata.routeLayerKeyByRoute.routeB);
    expect(metadata.routeLayerKeyByRoute.routeA).not.toBe(metadata.routeLayerKeyByRoute.routeC);
  });
});
