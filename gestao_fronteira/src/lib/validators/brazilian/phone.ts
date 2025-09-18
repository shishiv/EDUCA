/**
 * Brazilian phone number validation utilities
 * Supports both mobile (9 digits) and landline (8 digits) patterns
 */

export interface BrazilianPhoneFormat {
  formatted: string;
  raw: string;
  type: 'mobile' | 'landline' | 'invalid';
  ddd: string;
  number: string;
}

export function formatBrazilianPhone(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Handle different input lengths
  if (cleaned.length <= 2) {
    return `(${cleaned}`;
  } else if (cleaned.length <= 6) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  } else if (cleaned.length <= 10) {
    // Landline format: (XX) XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11) {
    // Mobile format: (XX) 9XXXX-XXXX
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  // Truncate if too long
  const truncated = cleaned.slice(0, 11);
  return `(${truncated.slice(0, 2)}) ${truncated.slice(2, 7)}-${truncated.slice(7)}`;
}

export function validateBrazilianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');

  // Must have 10 or 11 digits (DDD + number)
  if (cleaned.length !== 10 && cleaned.length !== 11) return false;

  // Validate DDD (area code) - valid Brazilian area codes
  const ddd = parseInt(cleaned.slice(0, 2));
  const validDDDs = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, // São Paulo
    21, 22, 24, // Rio de Janeiro
    27, 28, // Espírito Santo
    31, 32, 33, 34, 35, 37, 38, // Minas Gerais
    41, 42, 43, 44, 45, 46, // Paraná
    47, 48, 49, // Santa Catarina
    51, 53, 54, 55, // Rio Grande do Sul
    61, // Distrito Federal
    62, 64, // Goiás
    63, // Tocantins
    65, 66, // Mato Grosso
    67, // Mato Grosso do Sul
    68, // Acre
    69, // Rondônia
    71, 73, 74, 75, 77, // Bahia
    79, // Sergipe
    81, 87, // Pernambuco
    82, // Alagoas
    83, // Paraíba
    84, // Rio Grande do Norte
    85, 88, // Ceará
    86, 89, // Piauí
    91, 93, 94, // Pará
    92, 97, // Amazonas
    95, // Roraima
    96, // Amapá
    98, 99, // Maranhão
  ];

  if (!validDDDs.includes(ddd)) return false;

  const number = cleaned.slice(2);

  if (cleaned.length === 11) {
    // Mobile: must start with 9
    return number.charAt(0) === '9';
  } else {
    // Landline: cannot start with 0, 1, or 9
    const firstDigit = number.charAt(0);
    return firstDigit !== '0' && firstDigit !== '1' && firstDigit !== '9';
  }
}

export function parseBrazilianPhone(phone: string): BrazilianPhoneFormat {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length < 10 || cleaned.length > 11) {
    return {
      formatted: phone,
      raw: cleaned,
      type: 'invalid',
      ddd: '',
      number: ''
    };
  }

  const ddd = cleaned.slice(0, 2);
  const number = cleaned.slice(2);
  const isValid = validateBrazilianPhone(phone);

  let type: 'mobile' | 'landline' | 'invalid' = 'invalid';

  if (isValid) {
    type = cleaned.length === 11 ? 'mobile' : 'landline';
  }

  return {
    formatted: formatBrazilianPhone(phone),
    raw: cleaned,
    type,
    ddd,
    number
  };
}

export function removeBrazilianPhoneMask(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isBrazilianPhoneComplete(phone: string): boolean {
  const cleaned = removeBrazilianPhoneMask(phone);
  return cleaned.length === 10 || cleaned.length === 11;
}