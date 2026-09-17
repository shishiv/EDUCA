import { z } from 'zod'

const refreshTokenCodeSchema = z.object({ code: z.string() })
const refreshTokenMessageSchema = z.object({ message: z.string() })

/** Identifies Supabase errors that mean the browser's refresh token is no longer valid. */
export function isInvalidRefreshTokenError<Input>(error: Input): boolean {
  const parsedCode = refreshTokenCodeSchema.safeParse(error)
  const parsedMessage = refreshTokenMessageSchema.safeParse(error)
  const code = parsedCode.success ? parsedCode.data.code.toLowerCase() : ''
  const message = parsedMessage.success ? parsedMessage.data.message.toLowerCase() : ''
  return code === 'refresh_token_not_found'
    || message.includes('invalid refresh token')
    || message.includes('refresh token not found')
    || message.includes('refresh token is not valid')
    || message.includes('refresh_token_not_found')
}

/** Matches only Supabase auth cookies, never unrelated browser or developer state. */
export function isSupabaseAuthCookieName(name: string): boolean {
  return name.startsWith('sb-') && name.includes('-auth-token')
}
