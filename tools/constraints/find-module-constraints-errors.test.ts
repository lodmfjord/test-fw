/** @fileoverview Tests find module constraints errors. @module tools/constraints/find-module-constraints-errors.test */
import { describe, expect, it } from "bun:test";
import { findModuleConstraintsErrors } from "./find-module-constraints-errors";

describe("findModuleConstraintsErrors", () => {
  it("rejects imports from libs into apps", () => {
    const source = 'import { endpoints } from "../../../apps/test-app/src/endpoints";';
    const errors = findModuleConstraintsErrors("libs/client/src/bad-import.ts", source);

    expect(errors).toContain(
      'libs/client/src/bad-import.ts: libs files cannot import from apps ("../../../apps/test-app/src/endpoints").',
    );
  });

  it("rejects runtime imports across apps", () => {
    const source = 'import { endpoints } from "../../test-app/src/endpoints";';
    const errors = findModuleConstraintsErrors(
      "apps/test-app-client/src/runtime-import.ts",
      source,
    );

    expect(errors).toContain(
      'apps/test-app-client/src/runtime-import.ts: apps files cannot runtime-import from other apps ("../../test-app/src/endpoints"); use type-only imports.',
    );
  });

  it("allows type-only imports across apps", () => {
    const source = 'import type { endpoints } from "../../test-app/src/endpoints";';
    const errors = findModuleConstraintsErrors("apps/test-app-client/src/type-import.ts", source);

    expect(errors).toEqual([]);
  });

  it("rejects export star declarations", () => {
    const source = 'export * from "./internal";';
    const errors = findModuleConstraintsErrors("libs/client/src/index.ts", source);

    expect(errors).toContain(
      'libs/client/src/index.ts: export * is not allowed ("./internal"); use explicit named exports.',
    );
  });

  it("rejects deep src imports through package specifiers", () => {
    const source = 'import { schema } from "@babbstack/schema/src/schema";';
    const errors = findModuleConstraintsErrors("libs/http-api-contract/src/file.ts", source);

    expect(errors).toContain(
      'libs/http-api-contract/src/file.ts: deep cross-package src imports are not allowed ("@babbstack/schema/src/schema"); import from the package entrypoint.',
    );
  });
});
