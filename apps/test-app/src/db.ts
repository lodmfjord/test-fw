/**
 * @fileoverview Implements db.
 */
import {
  createDynamoDatabase,
  type ReadBoundDynamoDatabase,
  type WriteBoundDynamoDatabase,
} from "@babbstack/dynamodb";
import { schema } from "@babbstack/schema";
import { z } from "zod";

const pointZodDefinition = z.object({
  id: z.string(),
  name: z.string(),
  points: z.number(),
});

const titleZodDefinition = z.object({
  enabled: z.boolean(),
  id: z.string(),
  title: z.string(),
});

type PointItem = z.infer<typeof pointZodDefinition>;
type TitleItem = z.infer<typeof titleZodDefinition>;
const pointSchema = schema.fromZod(pointZodDefinition);
const titleSchema = schema.fromZod(titleZodDefinition);
const pointParser = {
  parse(input: unknown): PointItem {
    return pointSchema.parse(input) as PointItem;
  },
};
const titleParser = {
  parse(input: unknown): TitleItem {
    return titleSchema.parse(input) as TitleItem;
  },
};

const pointDatabase = createDynamoDatabase(pointParser, "id", {
  tableName: "test-db-one",
});

const titleDatabase = createDynamoDatabase(titleParser, "id", {
  tableName: "test-db-two",
});

export const testDatabases = {
  point: pointDatabase,
  title: titleDatabase,
};

export type PointDatabaseReadContext = ReadBoundDynamoDatabase<PointItem, "id">;
export type PointDatabaseWriteContext = WriteBoundDynamoDatabase<PointItem, "id">;
export type TitleDatabaseReadContext = ReadBoundDynamoDatabase<TitleItem, "id">;
export type TitleDatabaseWriteContext = WriteBoundDynamoDatabase<TitleItem, "id">;
