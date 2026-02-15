/**
 * @fileoverview Tests parseJsonc behavior.
 */
import { describe, expect, it } from "bun:test";
import { parseJsonc } from "./parse-jsonc";

describe("parseJsonc", () => {
  it("parses JSONC with comments and trailing commas", () => {
    const parsed = parseJsonc(`
{
  // comment
  "name": "demo",
  "list": [1, 2,],
}
`);

    expect(parsed).toEqual({
      list: [1, 2],
      name: "demo",
    });
  });

  it("keeps comment-looking text inside strings", () => {
    const parsed = parseJsonc('{"text":"// not a comment"}');
    expect(parsed).toEqual({ text: "// not a comment" });
  });
});
