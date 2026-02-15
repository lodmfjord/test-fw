/**
 * @fileoverview Implements get health handler.
 */
import { HEALTH_STATUS } from "./health-status";

/**
 * Gets health handler.
 * @example
 * getHealthHandler()
 * @returns Output value.
 */ export function getHealthHandler() {
  return {
    status: HEALTH_STATUS,
  };
}
