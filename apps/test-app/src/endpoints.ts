/**
 * @fileoverview Implements endpoints.
 */
import { lastUpdateEndpoints } from "./last-update-endpoints";
import { orderEndpoints } from "./order-endpoints";
import { s3DemoEndpoints } from "./s3-demo-endpoints";
import { stepFunctionDemoEndpoints } from "./step-function-demo";

export const endpoints = [
  lastUpdateEndpoints,
  s3DemoEndpoints,
  orderEndpoints,
  stepFunctionDemoEndpoints,
];
