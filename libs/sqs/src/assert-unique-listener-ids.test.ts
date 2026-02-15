/**
 * @fileoverview Tests assertUniqueListenerIds behavior.
 */
import { describe, expect, it } from "bun:test";
import { assertUniqueListenerIds } from "./assert-unique-listener-ids";

describe("assertUniqueListenerIds", () => {
  it("accepts unique listener ids", () => {
    expect(() =>
      assertUniqueListenerIds([{ listenerId: "a" }, { listenerId: "b" }] as never),
    ).not.toThrow();
  });

  it("throws for duplicate listener ids", () => {
    expect(() =>
      assertUniqueListenerIds([{ listenerId: "dup" }, { listenerId: "dup" }] as never),
    ).toThrow('SQS listener ID collision: "dup"');
  });
});
