/**
 * @fileoverview Tests documentation constraint validation for source files.
 */
import { describe, expect, it } from "bun:test";
import { findDocumentationConstraintsErrors } from "./find-documentation-constraints-errors";

describe("findDocumentationConstraintsErrors", () => {
  it("requires a file-level jsdoc header", () => {
    const source = "const value = 1;";
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain("file.ts: file must start with a file-level JSDoc header.");
  });

  it("requires @fileoverview in file-level jsdoc header", () => {
    const source = `/** File header. */\nconst value = 1;`;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: file-level JSDoc header must include "@fileoverview".');
  });

  it("rejects @module in file-level jsdoc header", () => {
    const source = `/** @fileoverview Cli. @module file */\nconst value = 1;`;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: file-level JSDoc header must not include "@module".');
  });

  it("requires multiline file-level jsdoc header", () => {
    const source = `/** @fileoverview Cli. */\nconst value = 1;`;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain("file.ts: file-level JSDoc header must use multiline JSDoc format.");
  });

  it("allows shebang before a valid multiline file-level jsdoc header", () => {
    const source = `#!/usr/bin/env bun\n/**\n * @fileoverview Cli.\n */\nconst value = 1;`;

    expect(findDocumentationConstraintsErrors("cli.ts", source)).toEqual([]);
  });

  it("requires jsdoc for function declarations", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      function helper() {}
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: function "helper" is missing JSDoc.');
  });

  it("requires jsdoc for function-valued variable declarations", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      const helper = () => {};
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: function "helper" is missing JSDoc.');
  });

  it("requires @example on exported function declarations", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      /**
       * Handles run.
       * @param input - Input value.
       */
      export function run(input: string) {}
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc must include @example.');
  });

  it("requires @param tags on exported function declarations", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      /**
       * Handles run.
       * @example \`run(input)\`
       */
      export function run(input: string) {}
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc is missing @param "input".');
  });

  it("requires @example on exported function-valued variable declarations", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      /**
       * Handles run.
       * @param input - Input value.
       */
      export const run = (input: string) => input;
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain('file.ts: exported function "run" JSDoc must include @example.');
  });

  it("requires multiline jsdoc format for exported functions", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      /** Handles run. @param input - Input value. @example \`run(input)\` */
      export function run(input: string) {}
    `;
    const errors = findDocumentationConstraintsErrors("file.ts", source);

    expect(errors).toContain(
      'file.ts: exported function "run" JSDoc must use multiline JSDoc format.',
    );
  });

  it("passes for documented exported functions", () => {
    const source = `
      /**
       * @fileoverview File.
       */
      /**
       * Handles run.
       * @param input - Input value.
       * @example
       * run(input)
       */
      export function run(input: string) {}
      /**
       * Handles helper.
       */
      function helper() {}
      /**
       * Handles mapper.
       */
      const mapper = () => {};
    `;

    expect(findDocumentationConstraintsErrors("file.ts", source)).toEqual([]);
  });
});
