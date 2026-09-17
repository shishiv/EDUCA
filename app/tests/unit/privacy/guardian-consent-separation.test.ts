/**
 * Privacy / Guardian Registration: consent separation tests
 *
 * Issue #77 - verifies that:
 * 1. Guardian registration does NOT require lgpd_consentimento=true
 * 2. The validation schema accepts lgpd_consentimento=false (default)
 * 3. Optional consent is truly optional and does not block necessary data
 */

import { describe, it, expect } from 'vitest'
import { prepareGuardianRegistration, type GuardianRegistrationForm } from '@/lib/services/guardian-registration'
import { studentRegistrationSchema } from '@/lib/validation/students-validation'

// We test the validation schema directly since it's the contract that
// previously enforced mandatory consent as a registration gate.

describe('guardian consent separation (#77)', () => {
  it('students-validation schema accepts lgpd_consentimento=false', () => {
    // The critical assertion: lgpd_consentimento=false must not cause validation failure
    // We only test this specific field, not the whole schema (other required fields would fail)
    const fieldSchema = studentRegistrationSchema.shape.lgpd_consentimento
    const resultFalse = fieldSchema.safeParse(false)
    const resultTrue = fieldSchema.safeParse(true)

    expect(resultFalse.success).toBe(true)
    expect(resultTrue.success).toBe(true)
  })

  it('lgpd_consentimento defaults to false when omitted', () => {
    const fieldSchema = studentRegistrationSchema.shape.lgpd_consentimento
    const resultUndefined = fieldSchema.safeParse(undefined)

    expect(resultUndefined.success).toBe(true)
    expect(resultUndefined.data).toBe(false)
  })

  const form: GuardianRegistrationForm = {
    nome: ' Maria Sintética da Silva ', cpf: '529.982.247-25', telefone: '(11) 99999-0001',
    email: '', parentesco: 'Mae', endereco: '', profissao: '', lgpd_consentimento: false,
  }
  const recordedAt = new Date('2026-09-08T12:30:00.000Z')
  const schoolId = '00000000-0000-0000-0000-000000000001'

  it('prepares the actual registration payload without optional consent', () => {
    const registration = prepareGuardianRegistration(form, schoolId, recordedAt)

    expect(registration).toEqual({
      valid: true,
      data: {
        nome: 'Maria Sintética da Silva', cpf: '52998224725', telefone: '11999990001',
        email: null, parentesco: 'Mae', endereco: null, profissao: null,
        lgpd_consentimento: false, lgpd_data_consentimento: null, escola_id: schoolId,
      },
    })
  })

  it('records the supplied time only when optional consent was given', () => {
    const registration = prepareGuardianRegistration({ ...form, lgpd_consentimento: true }, schoolId, recordedAt)
    if (!registration.valid) throw new Error(registration.error)

    expect(registration.data.lgpd_consentimento).toBe(true)
    expect(registration.data.lgpd_data_consentimento).toBe('2026-09-08T12:30:00.000Z')
  })

  it.each([
    [{ nome: '   ' }, 'ui.preencha-todos-os-campos-obrigatorios'],
    [{ cpf: '111.111.111-11' }, 'ui.cpf-invalido-verifique-os-dados-inseridos'],
    [{ telefone: '123' }, 'ui.telefone-invalido-informe-um-telefone-com-10-ou-11-digitos'],
  ])('rejects invalid registration fields independently of consent', (changes, error) => {
    for (const consent of [false, true]) {
      expect(prepareGuardianRegistration({ ...form, ...changes, lgpd_consentimento: consent }, schoolId, recordedAt))
        .toEqual({ valid: false, error })
    }
  })
})
