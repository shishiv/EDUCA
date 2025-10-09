import { z } from 'zod'

/**
 * Validação de CPF brasileiro (algoritmo oficial)
 * @param cpf - CPF formatado ou não (aceita "000.000.000-00" ou "00000000000")
 * @returns true se CPF é válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  // Remove formatação
  cpf = cpf.replace(/[^\d]/g, '')

  // CPF deve ter 11 dígitos
  if (cpf.length !== 11) return false

  // Rejeita CPFs com todos os dígitos iguais (ex: "111.111.111-11")
  if (/^(\d)\1+$/.test(cpf)) return false

  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf[i]) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf[9])) return false

  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf[i]) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf[10])) return false

  return true
}

/**
 * Formata CPF adicionando pontos e hífen
 * @param cpf - CPF sem formatação (11 dígitos)
 * @returns CPF formatado (000.000.000-00)
 */
export function formatCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, '')
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Validação de telefone brasileiro
 * Aceita formatos: (00) 0000-0000, (00) 00000-0000, (00)0000-0000, (00)00000-0000
 */
export function validateBrazilianPhone(phone: string): boolean {
  const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/
  return phoneRegex.test(phone)
}

/**
 * Formata telefone brasileiro
 * @param phone - Telefone sem formatação (10 ou 11 dígitos)
 * @returns Telefone formatado
 */
export function formatBrazilianPhone(phone: string): string {
  phone = phone.replace(/[^\d]/g, '')

  if (phone.length === 10) {
    // Telefone fixo: (00) 0000-0000
    return phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  } else if (phone.length === 11) {
    // Celular: (00) 00000-0000
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  return phone
}

/**
 * Schema de validação para formulário de primeiro login
 * Campos obrigatórios:
 * - nome_completo: Nome completo do usuário
 * - cpf: CPF válido brasileiro
 * - telefone: Telefone brasileiro formatado
 * - endereco: Endereço completo
 * - nova_senha: Senha forte (8+ chars, maiúscula, número, especial)
 * - confirmar_senha: Deve coincidir com nova_senha
 */
export const firstLoginSchema = z.object({
  nome_completo: z.string()
    .min(3, 'Nome deve ter no mínimo 3 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),

  cpf: z.string()
    .min(11, 'CPF deve ter 11 dígitos')
    .transform(val => val.replace(/[^\d]/g, ''))  // Remove formatação
    .refine(val => validateCPF(val), {
      message: 'CPF inválido. Verifique os dígitos digitados.'
    }),

  telefone: z.string()
    .min(10, 'Telefone deve ter 10 ou 11 dígitos')
    .regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, {
      message: 'Formato inválido. Use: (00) 00000-0000'
    })
    .transform(val => {
      // Normaliza para formato padrão: (00) 00000-0000
      const digits = val.replace(/[^\d]/g, '')
      return formatBrazilianPhone(digits)
    }),

  endereco: z.string()
    .min(10, 'Endereço deve ter no mínimo 10 caracteres')
    .max(200, 'Endereço deve ter no máximo 200 caracteres'),

  nova_senha: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(128, 'Senha deve ter no máximo 128 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos 1 letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos 1 letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos 1 número')
    .regex(/[^A-Za-z0-9]/, 'Senha deve conter pelo menos 1 caractere especial (@, #, $, etc.)'),

  confirmar_senha: z.string()
    .min(1, 'Por favor, confirme sua senha')
}).refine(data => data.nova_senha === data.confirmar_senha, {
  message: 'As senhas não coincidem',
  path: ['confirmar_senha']  // Erro aparece no campo confirmar_senha
})

/**
 * Tipo TypeScript inferido do schema
 */
export type FirstLoginFormData = z.infer<typeof firstLoginSchema>

/**
 * Helper para validar CPF standalone (sem Zod)
 * Útil para validações em tempo real no onChange
 */
export function isValidCPF(cpf: string): { valid: boolean; message?: string } {
  if (!cpf || cpf.length === 0) {
    return { valid: false, message: 'CPF é obrigatório' }
  }

  const cleanCPF = cpf.replace(/[^\d]/g, '')

  if (cleanCPF.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' }
  }

  if (validateCPF(cleanCPF)) {
    return { valid: true }
  } else {
    return { valid: false, message: 'CPF inválido' }
  }
}

/**
 * Helper para validar senha forte standalone
 * Útil para feedback em tempo real
 */
export function checkPasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong'
  feedback: string[]
} {
  const feedback: string[] = []

  if (password.length < 8) {
    feedback.push('Mínimo 8 caracteres')
  }
  if (!/[A-Z]/.test(password)) {
    feedback.push('Adicione letra maiúscula')
  }
  if (!/[a-z]/.test(password)) {
    feedback.push('Adicione letra minúscula')
  }
  if (!/[0-9]/.test(password)) {
    feedback.push('Adicione um número')
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    feedback.push('Adicione caractere especial (@, #, $)')
  }

  let strength: 'weak' | 'medium' | 'strong' = 'weak'

  if (feedback.length === 0) {
    strength = 'strong'
  } else if (feedback.length <= 2) {
    strength = 'medium'
  }

  return { strength, feedback }
}
