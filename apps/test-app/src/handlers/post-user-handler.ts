/**
 * @fileoverview Implements post user handler.
 */
import { createHash } from "node:crypto";
import { USER_ID_PREFIX } from "./user-id-prefix";

type InputContext = {
  body: {
    name: string;
  };
};

/**
 * Runs post user handler.
 * @param input - Input parameter.
 * @example
 * postUserHandler(input)
 * @returns Output value.
 */ export function postUserHandler({ body }: InputContext) {
  const digest = createHash("sha256").update(body.name).digest("hex").slice(0, 8);
  return {
    id: `${USER_ID_PREFIX}-${digest}`,
  };
}
