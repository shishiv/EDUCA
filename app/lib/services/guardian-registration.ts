import type { Database } from '@/types/database'
import { validateCPF, validatePhone } from '@/lib/validation/brazilian'

export interface GuardianRegistrationForm {
  nome: string
  cpf: string
  telefone: string
  email: string
  parentesco: string
  endereco: string
  profissao: string
  lgpd_consentimento: boolean
}

type GuardianRegistrationError =
  | 'ui.preencha-todos-os-campos-obrigatorios'
  | 'ui.cpf-invalido-verifique-os-dados-inseridos'
  | 'ui.telefone-invalido-informe-um-telefone-com-10-ou-11-digitos'

type GuardianRegistration =
  | { valid: false; error: GuardianRegistrationError }
  | { valid: true; data: Database['public']['Tables']['responsaveis']['Insert'] }

export function prepareGuardianRegistration(
  form: GuardianRegistrationForm,
  schoolId: string | null,
  recordedAt = new Date(),
): GuardianRegistration {
  if (!form.nome.trim() || !form.cpf || !form.parentesco) {
    return { valid: false, error: 'ui.preencha-todos-os-campos-obrigatorios' }
  }
  if (!validateCPF(form.cpf.replace(/\D/g, ''))) {
    return { valid: false, error: 'ui.cpf-invalido-verifique-os-dados-inseridos' }
  }
  if (form.telefone && !validatePhone(form.telefone)) {
    return { valid: false, error: 'ui.telefone-invalido-informe-um-telefone-com-10-ou-11-digitos' }
  }
  return { valid: true, data: guardianPayload(form, schoolId, recordedAt) }
}

function guardianPayload(form: GuardianRegistrationForm, schoolId: string | null, recordedAt: Date) {
  return {
    nome: form.nome.trim(),
    cpf: form.cpf.replace(/\D/g, ''),
    telefone: form.telefone ? form.telefone.replace(/\D/g, '') : null,
    email: form.email || null,
    parentesco: form.parentesco,
    endereco: form.endereco || null,
    profissao: form.profissao || null,
    lgpd_consentimento: form.lgpd_consentimento,
    lgpd_data_consentimento: form.lgpd_consentimento ? recordedAt.toISOString() : null,
    escola_id: schoolId,
  }
}
