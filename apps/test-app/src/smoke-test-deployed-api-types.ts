/**
 * @fileoverview Shared types for deployed smoke-test execution and endpoint expectations.
 */
import type { Logger } from "@babbstack/logger";

export type SmokeTestResult = {
  failed: number;
  passed: number;
  total: number;
};

export type DeployedFetch = (
  input: string | URL | Request,
  init?: RequestInit | undefined,
) => Promise<Response>;

export type DeployedSmokeTestOptions = {
  fetchImpl?: DeployedFetch;
  logger?: Logger;
  log?: (message: string) => void;
};

export type EndpointExpectation = {
  body?: unknown;
  method: "DELETE" | "GET" | "HEAD" | "OPTIONS" | "PATCH" | "POST" | "PUT";
  expectedStatusCode: number;
  name: string;
  path: string;
  validate: (payload: unknown, response: Response) => void;
};
