import { HEALTH_STATUS } from "./health-status";

export function getHealthHandler() {
  return {
    status: HEALTH_STATUS,
  };
}
