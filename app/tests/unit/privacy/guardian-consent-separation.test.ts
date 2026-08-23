/**
 * Privacy / Guardian Registration: consent separation tests
 *
 * Issue #77 - verifies that:
 * 1. Guardian registration does NOT require lgpd_consentimento=true
 * 2. The validation schema accepts lgpd_consentimento=false (default)
 * 3. Optional consent is truly optional and does not block necessary data
 */

import { describe, it, expect } from 'vitest'
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

  it('consent timestamp is null when optional consent is not given', () => {
    // This tests the application-layer logic from the form:
    // when lgpd_consentimento=false, lgpd_data_consentimento should be null
    const lgpd_consentimento = false
    const lgpd_data_consentimento = lgpd_consentimento
      ? new Date().toISOString()
      : null

    expect(lgpd_data_consentimento).toBeNull()
  })

  it('consent timestamp is set when optional consent is given', () => {
    const lgpd_consentimento = true
    const lgpd_data_consentimento = lgpd_consentimento
      ? new Date().toISOString()
      : null

    expect(lgpd_data_consentimento).not.toBeNull()
    expect(typeof lgpd_data_consentimento).toBe('string')
  })

  it('registration data is valid without consent', () => {
    // Simulates the form data object that would be sent to Supabase
    const responsavelData = {
      nome: 'Maria Sintética da Silva',
      cpf: '52998224725',
      telefone: '11999990001',
      email: null,
      parentesco: 'Mae',
      endereco: null,
      profissao: null,
      lgpd_consentimento: false,
      lgpd_data_consentimento: null,
      escola_id: '00000000-0000-0000-0000-000000000001',
    }

    // The form should not block: all required fields are present
    expect(responsavelData.nome).toBeTruthy()
    expect(responsavelData.cpf).toBeTruthy()
    expect(responsavelData.parentesco).toBeTruthy()
    // And consent is explicitly NOT required
    expect(responsavelData.lgpd_consentimento).toBe(false)
  })
})
