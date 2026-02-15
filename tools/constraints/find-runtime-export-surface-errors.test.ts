/**
 * @fileoverview Tests runtime export surface constraints.
 */
import { describe, expect, it } from "bun:test";
import { findRuntimeExportSurfaceErrors } from "./find-runtime-export-surface-errors";

/** Builds a source file with helper-object bag export. */
function toHelperObjectBagSource(): string {
  return `
/**
 * @fileoverview Helper bag source.
 */
function a() {
  return "a";
}

function b() {
  return "b";
}

export const helpers = {
  a,
  b,
};
`;
}

describe("findRuntimeExportSurfaceErrors", () => {
  it("returns no errors when file has one exported runtime symbol", () => {
    const source = `
/**
 * @fileoverview File.
 */
export const value = 1;
`;

    expect(findRuntimeExportSurfaceErrors("libs/example/src/value.ts", source)).toEqual([]);
  });

  it("returns no errors for type-only exports", () => {
    const source = `
/**
 * @fileoverview Types only.
 */
export type User = {
  id: string;
};
`;

    expect(findRuntimeExportSurfaceErrors("libs/example/src/types.ts", source)).toEqual([]);
  });

  it("reports multiple exported runtime symbols", () => {
    const source = `
/**
 * @fileoverview Runtime exports.
 */
export const one = 1;
export function two() {
  return 2;
}
`;

    expect(findRuntimeExportSurfaceErrors("libs/example/src/multi-runtime.ts", source)).toContain(
      "libs/example/src/multi-runtime.ts: has 2 exported runtime symbols (max 1).",
    );
  });

  it("exempts index files from exported runtime symbol limits", () => {
    const source = `
/**
 * @fileoverview Public entrypoint.
 */
export { one } from "./one";
export { two } from "./two";
`;

    expect(findRuntimeExportSurfaceErrors("libs/example/src/index.ts", source)).toEqual([]);
  });

  it("disallows exported helper-object bags with function-valued shorthand members", () => {
    const errors = findRuntimeExportSurfaceErrors(
      "libs/client/src/create-client-helpers.ts",
      toHelperObjectBagSource(),
    );

    expect(errors).toContain(
      'libs/client/src/create-client-helpers.ts: exported helper-object bags are not allowed ("helpers"). Keep helpers file-local and export one public entry function.',
    );
  });

  it("disallows exported helper-object bags with method shorthand", () => {
    const source = `
/**
 * @fileoverview Method bag.
 */
export const bag = {
  run() {
    return "ok";
  },
};
`;
    const errors = findRuntimeExportSurfaceErrors("libs/example/src/method-bag.ts", source);

    expect(errors).toContain(
      'libs/example/src/method-bag.ts: exported helper-object bags are not allowed ("bag"). Keep helpers file-local and export one public entry function.',
    );
  });

  it("disallows helper-object bags exported via export declarations", () => {
    const source = `
/**
 * @fileoverview Re-exported helper bag.
 */
function run() {
  return "ok";
}

const bag = {
  run,
};

export { bag };
`;
    const errors = findRuntimeExportSurfaceErrors("libs/example/src/re-exported-bag.ts", source);

    expect(errors).toContain(
      'libs/example/src/re-exported-bag.ts: exported helper-object bags are not allowed ("bag"). Keep helpers file-local and export one public entry function.',
    );
  });

  it("allows exported object literals without function-valued members", () => {
    const source = `
/**
 * @fileoverview Data object.
 */
export const config = {
  retries: 3,
  enabled: true,
};
`;

    expect(findRuntimeExportSurfaceErrors("libs/example/src/config.ts", source)).toEqual([]);
  });

  it("skips helper-object bag errors for allowlisted legacy files", () => {
    const source = `
/**
 * @fileoverview Legacy helper bag.
 */
function run() {
  return "ok";
}

const helpers = {
  run,
};

export { helpers };
`;

    expect(
      findRuntimeExportSurfaceErrors(
        "tools/constraints/find-documentation-constraints-jsdoc.ts",
        source,
      ),
    ).toEqual([]);
  });

  it("skips test files", () => {
    const source = `
/**
 * @fileoverview Test source.
 */
export const one = 1;
export const two = 2;
`;

    expect(findRuntimeExportSurfaceErrors("libs/example/src/example.test.ts", source)).toEqual([]);
  });
});
