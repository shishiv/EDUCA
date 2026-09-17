import { z } from 'zod'

// Shared with first access. Auth remains the authority for accepting a password.
export const newPasswordSchema = z.string().min(12).max(128)
  .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/)

export function recoveryPasswordError(password: string, confirmation: string): 'passwordInvalid' | 'passwordMismatch' | null {
  if (!newPasswordSchema.safeParse(password).success) return 'passwordInvalid'
  return password === confirmation ? null : 'passwordMismatch'
}
