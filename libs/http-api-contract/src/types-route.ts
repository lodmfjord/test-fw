/**
 * @fileoverview Implements types route.
 */
import type { RouteExecution, RouteExecutionInput } from "./route-execution-types";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD";

export type RouteAuth = "none" | "jwt" | "iam";

export type AwsRouteOptions = {
  authorizerId?: string;
  memoryMb?: number;
  timeoutSeconds?: number;
};

export type RouteInput = {
  auth?: RouteAuth;
  aws?: AwsRouteOptions;
  description?: string;
  env?: Array<Record<string, string>>;
  execution?: RouteExecutionInput;
  handler: string;
  method: string;
  operationId?: string;
  path: string;
  summary?: string;
  tags?: string[];
};

export type RouteDefinition = {
  auth: RouteAuth;
  aws?: AwsRouteOptions;
  description?: string;
  env?: Record<string, string>;
  execution: RouteExecution;
  handler: string;
  method: HttpMethod;
  operationId: string;
  path: string;
  routeId: string;
  summary?: string;
  tags: string[];
};
