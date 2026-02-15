import { lastUpdateEndpoints, lastUpdateListener } from "./last-update-endpoints";
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
  [
    postStepFunctionDemoEndpoint,
    postStepFunctionEventsEndpoint,
    postStepFunctionRandomBranchEndpoint,
  ],
];

export { lastUpdateListener, stepFunctionEventsListener };
export { lastUpdateQueue } from "./last-update-endpoints";
