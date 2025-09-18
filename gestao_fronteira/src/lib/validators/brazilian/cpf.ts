/**
 * Brazilian CPF validation utilities
 * CPF (Cadastro de Pessoa Física) is the Brazilian individual taxpayer registry
 */

export function formatCPF(cpf: string): string {
  // Remove all non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');

  // Apply CPF mask: XXX.XXX.XXX-XX
  if (cleaned.length <= 11) {
    return cleaned
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  }

  return cleaned.slice(0, 11)
    .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function validateCPF(cpf: string): boolean {
  // Remove all non-numeric characters
  const cleaned = cpf.replace(/\D/g, '');

  // Check if CPF has 11 digits
  if (cleaned.length !== 11) return false;

  // Check for known invalid patterns (all same digits)
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validate using check digit algorithm
  const digits = cleaned.split('').map(Number);

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += digits[i] * (10 - i);
  }
  let remainder = sum % 11;
  const firstCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  if (digits[9] !== firstCheckDigit) return false;

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += digits[i] * (11 - i);
  }
  remainder = sum % 11;
  const secondCheckDigit = remainder < 2 ? 0 : 11 - remainder;

  return digits[10] === secondCheckDigit;
}

export function removeCPFMask(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

export function isCPFComplete(cpf: string): boolean {
  const cleaned = removeCPFMask(cpf);
  return cleaned.length === 11;
}