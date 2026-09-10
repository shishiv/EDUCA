import { z } from 'zod'

/** JSON-shaped values accepted at file and form seams before domain parsing. */
export type JsonValue = string | number | boolean | undefined | null | JsonValue[] | JsonRecord

export type JsonRecord = { [key: string]: JsonValue }

/** Non-coercive scalar contracts used by each external-value seam. */
export const externalStringSchema = z.string()
export const externalBooleanSchema = z.boolean()

const externalNumberSchema = z.number().finite()
const externalScalarSchema = z.union([
  externalStringSchema,
  externalNumberSchema,
  externalBooleanSchema,
  z.null(),
  z.undefined(),
])

const externalJsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    externalScalarSchema,
    z.array(externalJsonValueSchema),
    z.record(externalJsonValueSchema),
  ]),
)

const externalRecordSchema = z.record(externalJsonValueSchema)

/**
 * Materializes a JSON record through Zod before a domain validator reads it.
 * Primitive field contracts remain non-coercive and reject boxed/tag-spoofed values.
 */
export function parseJsonRecord(value: JsonValue): JsonRecord | undefined {
  const result = externalRecordSchema.safeParse(value)
  return result.success ? result.data : undefined
}

/** Returns a primitive string only when Zod's non-coercive contract accepts it. */
export function parseJsonString(value: JsonValue): string | undefined {
  const result = externalStringSchema.safeParse(value)
  return result.success ? result.data : undefined
}

/** Returns a primitive boolean only when Zod's non-coercive contract accepts it. */
export function parseJsonBoolean(value: JsonValue): boolean | undefined {
  const result = externalBooleanSchema.safeParse(value)
  return result.success ? result.data : undefined
}
