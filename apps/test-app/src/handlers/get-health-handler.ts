/**
 * @fileoverview Implements get health handler.
 */
import { HEALTH_STATUS } from "./health-status";

/**
 * Gets health handler.
 * @example
 * getHealthHandler()
 */ export function getHealthHandler() {
  return {
    status: HEALTH_STATUS,
  };
}
