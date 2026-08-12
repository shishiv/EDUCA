import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

function createExpiredSyntheticAuthCookie(): string {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const expiredAccessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: 1, sub: '00000000-0000-0000-0000-000000000000' })}.synthetic-signature`
  const session = {
    access_token: expiredAccessToken,
    refresh_token: 'synthetic-refresh-token-that-does-not-exist',
    expires_at: 1,
    expires_in: 3600,
    token_type: 'bearer',
    user: { id: '00000000-0000-0000-0000-000000000000', aud: 'authenticated', role: 'authenticated' },
  }
  return `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
}

test('clears an invalid synthetic refresh token and redirects to login', async ({ page, context }) => {
  const appUrl = process.env.PLAYWRIGHT_BASE_URL || 'https://educa-r3-legacy-pilot.localhost'
  await context.addCookies([{
    name: 'sb-127-auth-token',
    value: createExpiredSyntheticAuthCookie(),
    url: appUrl,
    httpOnly: false,
    secure: appUrl.startsWith('https://'),
    sameSite: 'Lax',
  }])

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?reason=session_expired&returnUrl=%2Fdashboard/)
  const remainingCookies = await context.cookies()
  expect(remainingCookies.some(cookie => cookie.name.includes('-auth-token'))).toBe(false)
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
})
