/** @fileoverview Implements get health handler. @module apps/test-app/src/handlers/get-health-handler */
import { HEALTH_STATUS } from "./health-status";

/** Gets health handler. @example `getHealthHandler(input)` */ export function getHealthHandler() {
  return {
    status: HEALTH_STATUS,
  };
}
