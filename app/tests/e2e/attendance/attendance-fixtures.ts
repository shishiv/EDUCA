import { expect, type Page } from '@playwright/test'

/** Canonical seeded class used by the attendance E2E workflow. */
export const E2E_ATTENDANCE_CLASS_NAME = '2º Ano B E2E'

/** Paths for the canonical seeded attendance class and its chamada page. */
export interface E2EAttendancePaths {
  classPath: string
  classId: string
  attendancePath: string
}

/**
 * Discover the canonical E2E attendance fixture from the seeded class name.
 * This avoids selecting a disposable class created by another E2E journey.
 */
export async function discoverE2EAttendancePaths(page: Page): Promise<E2EAttendancePaths> {
  await page.goto('/dashboard/turmas')

  const classLink = page
    .locator('a[href^="/dashboard/turmas/"]:not([href="/dashboard/turmas/nova"])')
    .filter({ hasText: E2E_ATTENDANCE_CLASS_NAME })
    .first()
  await expect(classLink).toBeVisible({ timeout: 15000 })

  const classPath = await classLink.getAttribute('href')
  if (!classPath) throw new Error('Canonical E2E attendance class link has no href')

  const classId = classPath.split('/').pop()
  if (!classId) throw new Error('Canonical E2E attendance class link has no class ID')

  return {
    classPath,
    classId,
    attendancePath: `${classPath}/chamada`,
  }
}
