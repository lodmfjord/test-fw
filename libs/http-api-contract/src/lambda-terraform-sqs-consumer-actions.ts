/**
 * @fileoverview Defines reusable SQS consumer IAM actions for lambda listener policies.
 */

/**
 * SQS consumer IAM actions for lambda listeners.
 * @example
 * LAMBDA_SQS_CONSUMER_ACTIONS
 */
export const LAMBDA_SQS_CONSUMER_ACTIONS = [
  "sqs:ChangeMessageVisibility",
  "sqs:DeleteMessage",
  "sqs:GetQueueAttributes",
  "sqs:ReceiveMessage",
];
