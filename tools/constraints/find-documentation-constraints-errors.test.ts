/** @fileoverview Tests documentation constraint validation for source files. @module tools/constraints/find-documentation-constraints-errors.test */
import { describe, expect, it } from "bun:test";
import { findDocumentationConstraintsErrors } from "./find-documentation-constraints-errors";

describe("findDocumentationConstraintsErrors", () => {
  it("requires a file-level jsdoc header", () => {
    const source = "const value = 1;";
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain("file.ts: file must start with a file-level JSDoc header.");
  });

  it("allows shebang before file-level jsdoc header", () => {
    const source = `#!/usr/bin/env bun\n/** @fileoverview Cli. @module file */\nconst value = 1;`;

    expect(findDocumentationConstraintsErrors("cli.ts", source)).toEqual([]);
  });

  it("requires jsdoc for function declarations", () => {
    const source = `
      /** @fileoverview File. @module file */
      function helper() {}
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: function "helper" is missing JSDoc.');
  });

  it("requires jsdoc for function-valued variable declarations", () => {
    const source = `
      /** @fileoverview File. @module file */
      const helper = () => {};
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: function "helper" is missing JSDoc.');
  });

  it("requires @example on exported function declarations", () => {
    const source = `
      /** @fileoverview File. @module file */
      /** Handles run. */
      export function run() {}
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc must include @example.');
  });

  it("requires @example on exported function-valued variable declarations", () => {
    const source = `
      /** @fileoverview File. @module file */
      /** Handles run. */
      export const run = () => {};
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc must include @example.');
  });

  it("passes for documented exported functions", () => {
    const source = `
      /** @fileoverview File. @module file */
      /** Handles run. @example \`run(input)\` */
      export function run() {}
      /** Handles helper. */
      function helper() {}
      /** Handles mapper. */
      const mapper = () => {};
    `;

    expect(findDocumentationConstraintsErrors("file.ts", source)).toEqual([]);
  });
});
