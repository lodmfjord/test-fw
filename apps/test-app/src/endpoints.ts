/** @fileoverview Implements endpoints. @module apps/test-app/src/endpoints */
import { lastUpdateEndpoints, lastUpdateListener } from "./last-update-endpoints";
import { orderEndpoints } from "./order-endpoints";
import { s3DemoEndpoints } from "./s3-demo-endpoints";
import {
  postStepFunctionDemoEndpoint,
  postStepFunctionEventsEndpoint,
  postStepFunctionRandomBranchEndpoint,
  stepFunctionEventsListener,
} from "./step-function-demo";

export const endpoints = [
  lastUpdateEndpoints,
  s3DemoEndpoints,
  orderEndpoints,
  [
    postStepFunctionDemoEndpoint,
    postStepFunctionEventsEndpoint,
    postStepFunctionRandomBranchEndpoint,
  ],
];

export { lastUpdateListener, stepFunctionEventsListener };
export { lastUpdateQueue } from "./last-update-endpoints";
