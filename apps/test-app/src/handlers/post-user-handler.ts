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
 * Handles post user handler.
 * @param input - Input parameter.
 * @example
 * postUserHandler(input)
 */ export function postUserHandler({ body }: InputContext) {
  const digest = createHash("sha256").update(body.name).digest("hex").slice(0, 8);
  return {
    id: `${USER_ID_PREFIX}-${digest}`,
  };
}
