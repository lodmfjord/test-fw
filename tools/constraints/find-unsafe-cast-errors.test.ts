/**
 * @fileoverview Tests unsafe-cast constraint detection.
 */
import { describe, expect, it } from "bun:test";
import { findUnsafeCastErrors } from "./find-unsafe-cast-errors";

describe("findUnsafeCastErrors", () => {
  it("reports as never casts in non-test files", () => {
    const source = `
/**
 * @fileoverview File.
 */
const output = input as never;
`;

    expect(findUnsafeCastErrors("libs/sample/src/runtime.ts", source)).toEqual([
      'libs/sample/src/runtime.ts:5: unsafe cast "as never" is not allowed in non-test code.',
    ]);
  });

  it("reports as unknown as casts without an unsafe-cast marker", () => {
    const source = `
/**
 * @fileoverview File.
 */
const output = input as unknown as { id: string };
`;

    expect(findUnsafeCastErrors("libs/sample/src/runtime.ts", source)).toEqual([
      'libs/sample/src/runtime.ts:5: unsafe cast "as unknown as" requires an immediately preceding "// unsafe-cast:" comment.',
    ]);
  });

  it("allows as unknown as casts with a marker on the previous line", () => {
    const source = `
/**
 * @fileoverview File.
 */
// unsafe-cast: invariant = runtime guard ensures object shape
const output = input as unknown as { id: string };
`;

    expect(findUnsafeCastErrors("libs/sample/src/runtime.ts", source)).toEqual([]);
  });

  it("reports as unknown as when the marker is not on the previous line", () => {
    const source = `
/**
 * @fileoverview File.
 */
// unsafe-cast: invariant = runtime guard ensures object shape

const output = input as unknown as { id: string };
`;

    expect(findUnsafeCastErrors("libs/sample/src/runtime.ts", source)).toEqual([
      'libs/sample/src/runtime.ts:7: unsafe cast "as unknown as" requires an immediately preceding "// unsafe-cast:" comment.',
    ]);
  });

  it("exempts test files", () => {
    const source = `
/**
 * @fileoverview File.
 */
const one = input as never;
const two = input as unknown as { id: string };
`;

    expect(findUnsafeCastErrors("libs/sample/src/runtime.test.ts", source)).toEqual([]);
  });
});
