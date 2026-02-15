/** @fileoverview Implements post user handler. @module apps/test-app/src/handlers/post-user-handler */
import { createHash } from "node:crypto";
import { USER_ID_PREFIX } from "./user-id-prefix";

type InputContext = {
  body: {
    name: string;
  };
};

/** Handles post user handler. @example `postUserHandler(input)` */ export function postUserHandler({
  body,
}: InputContext) {
  const digest = createHash("sha256").update(body.name).digest("hex").slice(0, 8);
  return {
    id: `${USER_ID_PREFIX}-${digest}`,
  };
}
