/**
 * @fileoverview Implements create dev app.
 */
import { createRuntimeDynamoDb } from "@babbstack/dynamodb";
import { createNoopLogger } from "@babbstack/logger";
import { createRuntimeS3 } from "@babbstack/s3";
import { createRuntimeSqs } from "@babbstack/sqs";
import { findEndpointRuntimeDefinition } from "./find-endpoint-runtime-definition";
import { initializeEndpointEnv } from "./initialize-endpoint-env";
import { logDevAppFailure } from "./log-dev-app-failure";
import { toEndpointDatabaseContext } from "./to-endpoint-database-context";
import { toDevAppResponse } from "./to-dev-app-response";
import { toHttpRequestParts } from "./to-http-request-parts";
import { toRequestCorrelationId } from "./to-request-correlation-id";
import type { CreateDevAppOptions } from "./types";
import type { EndpointRuntimeDefinition } from "./types";
import { toEndpointSqsContext } from "./to-endpoint-sqs-context";
import { toEndpointS3Context } from "./to-endpoint-s3-context";
import { toEndpointHandlerOutput } from "./to-endpoint-handler-output";
import { toStepFunctionEndpointOutput } from "./to-step-function-endpoint-output";

type DevAppHandlerContext = {
  body: unknown;
  database: unknown;
  db: unknown;
  headers: unknown;
  params: unknown;
  query: unknown;
  request: Request;
  s3: unknown;
  sqs: unknown;
};

/** Runs read json body. */
async function readJsonBody(request: Request): Promise<unknown> {
  const source = await request.text();

  if (source.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new Error("body: expected valid JSON");
  }
}

/**
 * Creates dev app.
 * @param endpoints - Endpoints parameter.
 * @param options - Options parameter.
 * @example
 * createDevApp(endpoints, options)
 * @returns Output value.
 */
export function createDevApp(
  endpoints: ReadonlyArray<EndpointRuntimeDefinition>,
  options: CreateDevAppOptions = {},
): (request: Request) => Promise<Response> {
  const db = options.db ?? createRuntimeDynamoDb();
  const logger = options.logger ?? createNoopLogger();
  const s3 = options.s3 ?? createRuntimeS3();
  const sqs = options.sqs ?? createRuntimeSqs();
  initializeEndpointEnv(endpoints, logger);

  return async function fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const requestId = toRequestCorrelationId(request);
    /** Converts to response. */ const toResponse = (
      status: number,
      payload: unknown,
      contentType?: string,
      headers?: Record<string, string>,
    ): Response => toDevAppResponse(status, payload, contentType, headers, requestId);

    const matched = findEndpointRuntimeDefinition(endpoints, method, url.pathname);
    if (!matched) {
      return toResponse(404, { error: "Not found" });
    }

    const { endpoint, params } = matched;

    let parsedBody: unknown;
    if (endpoint.request.body) {
      try {
        parsedBody = await readJsonBody(request);
      } catch (error) {
        const message = error instanceof Error ? error.message : "body: expected valid JSON";
        return toResponse(400, { error: message });
      }
    }

    const requestParts = toHttpRequestParts(url, request.headers);
    const rawHeaders = requestParts.headers;
    const rawQuery = requestParts.query;

    let validatedParams: unknown = params;
    let validatedQuery: unknown = rawQuery;
    let validatedHeaders: unknown = rawHeaders;
    let validatedBody: unknown = parsedBody;

    try {
      validatedParams = endpoint.request.params
        ? endpoint.request.params.parse(params, "params")
        : validatedParams;
      validatedQuery = endpoint.request.query
        ? endpoint.request.query.parse(rawQuery, "query")
        : validatedQuery;
      validatedHeaders = endpoint.request.headers
        ? endpoint.request.headers.parse(rawHeaders, "headers")
        : validatedHeaders;
      validatedBody = endpoint.request.body
        ? endpoint.request.body.parse(parsedBody, "body")
        : validatedBody;
    } catch (error) {
      const message = error instanceof Error ? error.message : "input validation failed";
      return toResponse(400, { error: message });
    }

    let output: unknown;
    try {
      if (endpoint.execution?.kind === "step-function") {
        output = await toStepFunctionEndpointOutput(
          endpoint,
          {
            body: validatedBody,
            headers: validatedHeaders,
            method,
            params: validatedParams,
            path: endpoint.path,
            query: validatedQuery,
            routeId: endpoint.routeId,
          },
          {
            ...(options.stepFunctionTaskHandlers
              ? { taskHandlers: options.stepFunctionTaskHandlers }
              : {}),
          },
        );
      } else {
        if (!endpoint.handler) {
          throw new Error("Missing handler for lambda endpoint");
        }

        const endpointDatabaseContext = toEndpointDatabaseContext(db, endpoint);
        const endpointS3 = toEndpointS3Context(s3, endpoint);
        const endpointSqs = toEndpointSqsContext(sqs, endpoint);
        const handler = endpoint.handler as (
          context: DevAppHandlerContext,
        ) => Promise<unknown> | unknown;

        output = await handler({
          body: validatedBody,
          database: endpointDatabaseContext.database,
          db: endpointDatabaseContext.db,
          headers: validatedHeaders,
          params: validatedParams,
          query: validatedQuery,
          request,
          s3: endpointS3,
          sqs: endpointSqs,
        });
      }
    } catch (error) {
      logDevAppFailure({
        error,
        event: "dev_app.handler_execution_failed",
        logger,
        method,
        path: url.pathname,
        requestId,
        routeId: endpoint.routeId,
      });
      return toResponse(500, { error: "Handler execution failed" });
    }

    try {
      const handlerOutput = toEndpointHandlerOutput(output, endpoint.successStatusCode);
      if (typeof Buffer !== "undefined" && Buffer.isBuffer(handlerOutput.value)) {
        return toResponse(
          handlerOutput.statusCode ?? 200,
          handlerOutput.value,
          handlerOutput.contentType,
          handlerOutput.headers,
        );
      }

      const responseSchema =
        endpoint.responseByStatusCode[String(handlerOutput.statusCode)] ?? endpoint.response;
      const validatedOutput = responseSchema.parse(handlerOutput.value, "response");
      return toResponse(
        handlerOutput.statusCode ?? 200,
        validatedOutput,
        handlerOutput.contentType,
        handlerOutput.headers,
      );
    } catch (error) {
      logDevAppFailure({
        error,
        event: "dev_app.output_validation_failed",
        logger,
        method,
        path: url.pathname,
        requestId,
        routeId: endpoint.routeId,
      });
      return toResponse(500, { error: "Output validation failed" });
    }
  };
}
