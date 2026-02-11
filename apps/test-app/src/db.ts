import {
  createDynamoDatabase,
  type ReadBoundDynamoDatabase,
  type WriteBoundDynamoDatabase,
} from "@simple-api/dynamodb";
import { schema } from "@simple-api/schema";
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

export const pointDatabase = createDynamoDatabase(pointParser, "id", {
  tableName: "test-db-one",
});

export const titleDatabase = createDynamoDatabase(titleParser, "id", {
  tableName: "test-db-two",
});

export type PointDatabaseReadContext = ReadBoundDynamoDatabase<PointItem, "id">;
export type PointDatabaseWriteContext = WriteBoundDynamoDatabase<PointItem, "id">;
export type TitleDatabaseReadContext = ReadBoundDynamoDatabase<TitleItem, "id">;
export type TitleDatabaseWriteContext = WriteBoundDynamoDatabase<TitleItem, "id">;
