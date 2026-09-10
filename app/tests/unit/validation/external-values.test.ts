import { describe, expect, it } from 'vitest'

import {
  externalBooleanSchema,
  externalStringSchema,
} from '@/lib/validation/external-values'

describe('external value seams', () => {
  it('rejects boxed primitives instead of coercing them', () => {
    expect(externalStringSchema.safeParse(new String('synthetic')).success).toBe(false)
    expect(externalBooleanSchema.safeParse(new Boolean(false)).success).toBe(false)
  })

  it('rejects Symbol.toStringTag spoofs and unrelated values', () => {
    const spoofedString = { [Symbol.toStringTag]: 'String' }
    const spoofedBoolean = { [Symbol.toStringTag]: 'Boolean' }

    expect(externalStringSchema.safeParse(spoofedString).success).toBe(false)
    expect(externalBooleanSchema.safeParse(spoofedBoolean).success).toBe(false)
    expect(externalStringSchema.safeParse(42).success).toBe(false)
    expect(externalBooleanSchema.safeParse('false').success).toBe(false)
  })
})
