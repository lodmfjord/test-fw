/**
 * @fileoverview Implements create logger.
 */
import { Logger as PowertoolsLogger } from "@aws-lambda-powertools/logger";
import type { ConstructorOptions } from "@aws-lambda-powertools/logger/types";
import type { CreateLoggerInput, Logger } from "./types";

/**
 * Converts to powertools options.
 * @param input - Input parameter.
 * @example
 * toPowertoolsOptions(input)
 * @returns Output value.
 */
function toPowertoolsOptions(input: CreateLoggerInput): ConstructorOptions {
  return {
    ...(input.logLevel ? { logLevel: input.logLevel } : {}),
    ...(input.persistentKeys ? { persistentKeys: input.persistentKeys } : {}),
    ...(input.sampleRateValue !== undefined ? { sampleRateValue: input.sampleRateValue } : {}),
    ...(input.serviceName ? { serviceName: input.serviceName } : {}),
  };
}

/**
 * Converts to logger.
 * @param logger - Logger parameter.
 * @example
 * toLogger(logger)
 * @returns Output value.
 */
function toLogger(logger: PowertoolsLogger): Logger {
  return {
    debug(message, payload) {
      if (payload === undefined) {
        logger.debug(message);
        return;
      }

      if (payload instanceof Error) {
        logger.debug(message, payload);
        return;
      }

      logger.debug({
        ...payload,
        message,
      });
    },
    error(message, payload) {
      if (payload === undefined) {
        logger.error(message);
        return;
      }

      if (payload instanceof Error) {
        logger.error(message, payload);
        return;
      }

      logger.error({
        ...payload,
        message,
      });
    },
    getPersistentKeys() {
      return logger.getPersistentLogAttributes();
    },
    info(message, payload) {
      if (payload === undefined) {
        logger.info(message);
        return;
      }

      if (payload instanceof Error) {
        logger.info(message, payload);
        return;
      }

      logger.info({
        ...payload,
        message,
      });
    },
    warn(message, payload) {
      if (payload === undefined) {
        logger.warn(message);
        return;
      }

      if (payload instanceof Error) {
        logger.warn(message, payload);
        return;
      }

      logger.warn({
        ...payload,
        message,
      });
    },
  };
}

/**
 * Creates logger.
 * @param input - Input parameter.
 * @example
 * createLogger({ serviceName: "orders" })
 * @returns Output value.
 */
export function createLogger(input: CreateLoggerInput = {}): Logger {
  const logger = new PowertoolsLogger(toPowertoolsOptions(input));
  return toLogger(logger);
}
