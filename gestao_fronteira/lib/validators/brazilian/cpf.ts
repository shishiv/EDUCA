/**
 * Brazilian CPF (Cadastro de Pessoas Físicas) Validator
 *
 * CPF Format: XXX.XXX.XXX-XX (11 digits)
 *
 * Compliance:
 * - INEP educational standards
 * - LGPD data validation requirements
 * - Receita Federal formatting rules
 */

/**
 * Validates a Brazilian CPF number using check digits algorithm
 *
 * @param cpf - CPF string (with or without formatting)
 * @returns true if valid, false otherwise
 *
 * @example
 * validateCPF('123.456.789-09') // true
 * validateCPF('12345678909')    // true
 * validateCPF('000.000.000-00') // false (known invalid)
 * validateCPF('111.111.111-11') // false (sequential digits)
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false

  // Remove all non-digit characters
  const cleanCPF = cpf.replace(/\D/g, '')

  // CPF must have exactly 11 digits
  if (cleanCPF.length !== 11) return false

  // Reject known invalid CPFs (all same digits)
  const invalidCPFs = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ]

  if (invalidCPFs.includes(cleanCPF)) return false

  // Validate first check digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
  }
  let checkDigit1 = 11 - (sum % 11)
  if (checkDigit1 >= 10) checkDigit1 = 0

  if (checkDigit1 !== parseInt(cleanCPF.charAt(9))) return false

  // Validate second check digit
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
  }
  let checkDigit2 = 11 - (sum % 11)
  if (checkDigit2 >= 10) checkDigit2 = 0

  if (checkDigit2 !== parseInt(cleanCPF.charAt(10))) return false

  return true
}

/**
 * Formats a CPF string to XXX.XXX.XXX-XX pattern
 *
 * @param cpf - CPF string (with or without formatting)
 * @returns Formatted CPF or original string if invalid
 *
 * @example
 * formatCPF('12345678909')      // '123.456.789-09'
 * formatCPF('123.456.789-09')   // '123.456.789-09'
 * formatCPF('123')              // '123'
 */
export function formatCPF(cpf: string): string {
  if (!cpf) return ''

  // Remove all non-digit characters
  const cleanCPF = cpf.replace(/\D/g, '')

  // Only format if we have digits
  if (cleanCPF.length === 0) return ''

  // Apply formatting progressively as user types
  if (cleanCPF.length <= 3) {
    return cleanCPF
  } else if (cleanCPF.length <= 6) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3)}`
  } else if (cleanCPF.length <= 9) {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6)}`
  } else {
    return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9, 11)}`
  }
}

/**
 * Removes all formatting from a CPF string, returning only digits
 *
 * @param cpf - Formatted or unformatted CPF
 * @returns CPF with only digits
 *
 * @example
 * unformatCPF('123.456.789-09') // '12345678909'
 * unformatCPF('12345678909')    // '12345678909'
 */
export function unformatCPF(cpf: string): string {
  if (!cpf) return ''
  return cpf.replace(/\D/g, '')
}

/**
 * Masks a CPF for display, showing only first 3 and last 2 digits
 * Used for LGPD compliance when displaying sensitive data
 *
 * @param cpf - CPF to mask
 * @returns Masked CPF
 *
 * @example
 * maskCPF('123.456.789-09') // '123.***.***-09'
 * maskCPF('12345678909')    // '123.***.***-09'
 */
export function maskCPF(cpf: string): string {
  if (!cpf) return ''

  const cleanCPF = unformatCPF(cpf)
  if (cleanCPF.length !== 11) return cpf

  return `${cleanCPF.slice(0, 3)}.***.***-${cleanCPF.slice(9, 11)}`
}

/**
 * Generates a valid random CPF for testing purposes only
 *
 * ⚠️ WARNING: For testing only. Never use in production for real users.
 *
 * @returns Valid random CPF in XXX.XXX.XXX-XX format
 */
export function generateRandomCPF(): string {
  // Generate 9 random digits
  const randomDigits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10))

  // Calculate first check digit
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += randomDigits[i] * (10 - i)
  }
  let checkDigit1 = 11 - (sum % 11)
  if (checkDigit1 >= 10) checkDigit1 = 0

  // Calculate second check digit
  const digitsWithFirst = [...randomDigits, checkDigit1]
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += digitsWithFirst[i] * (11 - i)
  }
  let checkDigit2 = 11 - (sum % 11)
  if (checkDigit2 >= 10) checkDigit2 = 0

  // Combine all digits
  const fullCPF = [...randomDigits, checkDigit1, checkDigit2].join('')

  // Return formatted
  return formatCPF(fullCPF)
}
