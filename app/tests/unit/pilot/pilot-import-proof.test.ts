// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { expectedCanonicalCount } from '@/scripts/pilot-import-proof'

describe('pilot import proof rollback receipts', () => {
  it('keeps a valid count enforceable when another count is malformed', () => {
    const canonicalCounts = {
      students: 1,
      guardians: '1',
      relationships: 1,
      enrollments: 1,
      storageObjects: 1,
    }

    expect(expectedCanonicalCount(canonicalCounts, 'students')).toBe(1)
    expect(expectedCanonicalCount(canonicalCounts, 'guardians')).toBeNull()
  })
})
