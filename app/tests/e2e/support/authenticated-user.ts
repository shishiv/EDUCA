import { Buffer } from 'node:buffer'
import { z } from 'zod'

export interface AuthCookie {
  name: string
  value: string
}

const authSessionSchema = z.object({ user: z.object({ id: z.string().min(1) }) })

function authCookiePartIndex(name: string): number {
  const suffix = /\.(\d+)$/.exec(name)
  return suffix ? Number(suffix[1]) : 0
}

export function authenticatedUserId(cookies: readonly AuthCookie[]): string | null {
  const firstAuthCookie = cookies.find(cookie => /^sb-.*-auth-token(?:\.\d+)?$/.test(cookie.name))
  if (!firstAuthCookie) return null
  const baseName = firstAuthCookie.name.replace(/\.\d+$/, '')
  const cookieValue = cookies
    .filter(cookie => cookie.name === baseName || cookie.name.startsWith(`${baseName}.`))
    .sort((left, right) => authCookiePartIndex(left.name) - authCookiePartIndex(right.name))
    .map(cookie => cookie.value)
    .join('')

  try {
    const encodedSession = decodeURIComponent(cookieValue)
    if (!encodedSession.startsWith('base64-')) return null
    const sessionJson = Buffer.from(encodedSession.slice('base64-'.length), 'base64url').toString('utf8')
    const session = authSessionSchema.safeParse(JSON.parse(sessionJson))
    return session.success ? session.data.user.id : null
  } catch {
    return null
  }
}
