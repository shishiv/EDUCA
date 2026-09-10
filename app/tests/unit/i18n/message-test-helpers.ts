import { z } from 'zod'

type MessageTree = string | MessageObject

interface MessageObject {
  readonly [key: string]: MessageTree
}

const messageTreeSchema: z.ZodType<MessageTree> = z.lazy(() =>
  z.union([z.string(), z.record(messageTreeSchema)]),
)

const messageObjectSchema: z.ZodType<MessageObject> = z.record(messageTreeSchema)

function parseMessageTree(value: MessageTree): MessageTree {
  return messageTreeSchema.parse(value)
}

export function isMessageObject(value: MessageTree): value is MessageObject {
  return messageObjectSchema.safeParse(value).success
}

export function leafPaths(value: MessageTree, prefix = ''): string[] {
  const message = parseMessageTree(value)
  if (!isMessageObject(message)) return [prefix]

  return Object.entries(message).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  )
}

export function messageAt(messages: MessageTree, path: string): MessageTree | undefined {
  return path.split('.').reduce<MessageTree | undefined>((value, key) => {
    if (!value || !isMessageObject(value)) return undefined
    return value[key]
  }, parseMessageTree(messages))
}
