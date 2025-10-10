/**
 * Brazilian Phone Number Validator
 *
 * Phone Formats:
 * - Landline: (XX) XXXX-XXXX (10 digits)
 * - Mobile: (XX) 9XXXX-XXXX (11 digits)
 *
 * Compliance:
 * - ANATEL (Agência Nacional de Telecomunicações) standards
 * - Mobile numbers start with 9 (9th digit rule implemented in 2016)
 */

/**
 * Validates a Brazilian phone number (landline or mobile)
 *
 * @param phone - Phone string (with or without formatting)
 * @returns true if valid, false otherwise
 *
 * @example
 * validatePhone('(11) 98765-4321')  // true (mobile)
 * validatePhone('(11) 3456-7890')   // true (landline)
 * validatePhone('11987654321')      // true (mobile without formatting)
 * validatePhone('(11) 1234-5678')   // false (landline can't start with 1)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false

  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')

  // Phone must have 10 digits (landline) or 11 digits (mobile)
  if (cleanPhone.length !== 10 && cleanPhone.length !== 11) return false

  // Extract area code (DDD)
  const areaCode = parseInt(cleanPhone.slice(0, 2))

  // Valid Brazilian area codes (11-99)
  // Must be between 11 and 99 (no area code starts with 0)
  if (areaCode < 11 || areaCode > 99) return false

  // Extract first digit of the phone number
  const firstDigit = parseInt(cleanPhone.charAt(2))

  if (cleanPhone.length === 11) {
    // Mobile phone: must start with 9
    if (firstDigit !== 9) return false
  } else {
    // Landline: cannot start with 0, 1, or 9
    if (firstDigit === 0 || firstDigit === 1 || firstDigit === 9) return false
  }

  return true
}

/**
 * Formats a phone string to Brazilian standard
 * - Mobile: (XX) 9XXXX-XXXX
 * - Landline: (XX) XXXX-XXXX
 *
 * @param phone - Phone string (with or without formatting)
 * @returns Formatted phone or original string if invalid
 *
 * @example
 * formatPhone('11987654321')      // '(11) 98765-4321'
 * formatPhone('1134567890')       // '(11) 3456-7890'
 * formatPhone('(11) 98765-4321')  // '(11) 98765-4321'
 */
export function formatPhone(phone: string): string {
  if (!phone) return ''

  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')

  // Only format if we have digits
  if (cleanPhone.length === 0) return ''

  // Apply formatting progressively as user types
  if (cleanPhone.length <= 2) {
    // Just area code
    return cleanPhone.length === 2 ? `(${cleanPhone})` : cleanPhone
  } else if (cleanPhone.length <= 6) {
    // Area code + first part of number
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2)}`
  } else if (cleanPhone.length <= 10) {
    // Landline format: (XX) XXXX-XXXX
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6, 10)}`
  } else {
    // Mobile format: (XX) 9XXXX-XXXX (11 digits)
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7, 11)}`
  }
}

/**
 * Removes all formatting from a phone string, returning only digits
 *
 * @param phone - Formatted or unformatted phone
 * @returns Phone with only digits
 *
 * @example
 * unformatPhone('(11) 98765-4321') // '11987654321'
 * unformatPhone('11987654321')     // '11987654321'
 */
export function unformatPhone(phone: string): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Determines if a phone number is mobile or landline
 *
 * @param phone - Phone string (with or without formatting)
 * @returns 'mobile' | 'landline' | 'invalid'
 *
 * @example
 * getPhoneType('(11) 98765-4321')  // 'mobile'
 * getPhoneType('(11) 3456-7890')   // 'landline'
 * getPhoneType('123')              // 'invalid'
 */
export function getPhoneType(phone: string): 'mobile' | 'landline' | 'invalid' {
  if (!validatePhone(phone)) return 'invalid'

  const cleanPhone = unformatPhone(phone)

  // Mobile has 11 digits and starts with 9
  if (cleanPhone.length === 11 && cleanPhone.charAt(2) === '9') {
    return 'mobile'
  }

  // Landline has 10 digits
  if (cleanPhone.length === 10) {
    return 'landline'
  }

  return 'invalid'
}

/**
 * Masks a phone for display, showing only area code and last 4 digits
 * Used for LGPD compliance when displaying sensitive data
 *
 * @param phone - Phone to mask
 * @returns Masked phone
 *
 * @example
 * maskPhone('(11) 98765-4321') // '(11) *****-4321'
 * maskPhone('(11) 3456-7890')  // '(11) ****-7890'
 */
export function maskPhone(phone: string): string {
  if (!phone) return ''

  const cleanPhone = unformatPhone(phone)
  if (!validatePhone(phone)) return phone

  if (cleanPhone.length === 11) {
    // Mobile: (XX) *****-XXXX
    return `(${cleanPhone.slice(0, 2)}) *****-${cleanPhone.slice(7, 11)}`
  } else {
    // Landline: (XX) ****-XXXX
    return `(${cleanPhone.slice(0, 2)}) ****-${cleanPhone.slice(6, 10)}`
  }
}

/**
 * Extracts area code (DDD) from phone number
 *
 * @param phone - Phone string (with or without formatting)
 * @returns Area code (2 digits) or null if invalid
 *
 * @example
 * getAreaCode('(11) 98765-4321') // '11'
 * getAreaCode('11987654321')     // '11'
 * getAreaCode('123')             // null
 */
export function getAreaCode(phone: string): string | null {
  if (!phone) return null

  const cleanPhone = unformatPhone(phone)
  if (cleanPhone.length < 10) return null

  return cleanPhone.slice(0, 2)
}

/**
 * Generates a valid random Brazilian phone number for testing
 *
 * ⚠️ WARNING: For testing only. Never use in production for real users.
 *
 * @param type - 'mobile' | 'landline' (default: 'mobile')
 * @returns Valid random phone in formatted pattern
 *
 * @example
 * generateRandomPhone('mobile')    // '(11) 98765-4321'
 * generateRandomPhone('landline')  // '(11) 3456-7890'
 */
export function generateRandomPhone(type: 'mobile' | 'landline' = 'mobile'): string {
  // Random area code between 11 and 99
  const areaCode = Math.floor(Math.random() * 89) + 11

  if (type === 'mobile') {
    // Mobile: 9 + 4 digits + 4 digits
    const firstPart = 9000 + Math.floor(Math.random() * 1000)
    const secondPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return formatPhone(`${areaCode}${firstPart}${secondPart}`)
  } else {
    // Landline: 2-8 + 3 digits + 4 digits (cannot start with 0, 1, or 9)
    const validFirstDigits = [2, 3, 4, 5, 6, 7, 8]
    const firstDigit = validFirstDigits[Math.floor(Math.random() * validFirstDigits.length)]
    const firstPart = firstDigit * 1000 + Math.floor(Math.random() * 1000)
    const secondPart = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return formatPhone(`${areaCode}${firstPart}${secondPart}`)
  }
}

/**
 * List of valid Brazilian area codes (DDD) by region
 * Source: ANATEL (Agência Nacional de Telecomunicações)
 */
export const BRAZILIAN_AREA_CODES = {
  // Região 1 - São Paulo
  sao_paulo: [11, 12, 13, 14, 15, 16, 17, 18, 19],

  // Região 2 - Rio de Janeiro e Espírito Santo
  rio_espirito: [21, 22, 24, 27, 28],

  // Região 3 - Minas Gerais
  minas_gerais: [31, 32, 33, 34, 35, 37, 38],

  // Região 4 - Bahia e Sergipe
  bahia_sergipe: [71, 73, 74, 75, 77, 79],

  // Região 5 - Pernambuco, Alagoas, Paraíba e Rio Grande do Norte
  nordeste: [81, 82, 83, 84, 87],

  // Região 6 - Ceará, Piauí e Maranhão
  norte_nordeste: [85, 86, 88, 89, 98, 99],

  // Região 7 - Brasília, Goiás, Tocantins e Roraima
  centro_oeste_norte: [61, 62, 63, 64, 95],

  // Região 8 - Mato Grosso, Mato Grosso do Sul, Acre, Rondônia e Amazonas
  norte_centro: [65, 66, 67, 68, 69, 92, 97],

  // Região 9 - Paraná e Santa Catarina
  sul: [41, 42, 43, 44, 45, 46, 47, 48, 49],

  // Região 10 - Rio Grande do Sul
  rio_grande_sul: [51, 53, 54, 55],
} as const

/**
 * Gets the region name for a given area code
 *
 * @param areaCode - Area code (DDD)
 * @returns Region name or 'unknown' if not found
 */
export function getRegionByAreaCode(areaCode: string | number): string {
  const code = typeof areaCode === 'string' ? parseInt(areaCode) : areaCode

  for (const [region, codes] of Object.entries(BRAZILIAN_AREA_CODES)) {
    if (codes.includes(code as any)) {
      return region.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  return 'unknown'
}
