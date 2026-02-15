/**
 * @fileoverview Test preload that normalises environment for deterministic test runs.
 * Sets the process timezone to UTC so date-dependent assertions are stable.
 */
process.env.TZ = "UTC";
