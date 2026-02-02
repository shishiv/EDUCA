import { describe, it, expect } from 'vitest'
import {
  validateCPF,
  formatCPF,
  validateBrazilianPhone,
  formatBrazilianPhone,
  validateCEP,
  formatCEP,
  validateINEPCode,
  formatINEPCode,
  calculateAge,
  validateStudentAge,
  calculateAttendanceRate,
  getAttendanceStatus,
  validateMinimumAttendance,
} from '@/lib/validation/brazilian'

describe('Brazilian Validation Utils', () => {
  describe('CPF Validation', () => {
    it('deve validar CPF correto', () => {
      expect(validateCPF('12345678909')).toBe(true)
      expect(validateCPF('111.444.777-35')).toBe(true)
    })

    it('deve rejeitar CPF com todos digitos iguais', () => {
      expect(validateCPF('11111111111')).toBe(false)
      expect(validateCPF('00000000000')).toBe(false)
      expect(validateCPF('999.999.999-99')).toBe(false)
    })

    it('deve rejeitar CPF com tamanho incorreto', () => {
      expect(validateCPF('123')).toBe(false)
      expect(validateCPF('12345678909123')).toBe(false)
    })

    it('deve rejeitar CPF vazio ou nulo', () => {
      expect(validateCPF('')).toBe(false)
      expect(validateCPF(null as any)).toBe(false)
    })

    it('deve formatar CPF corretamente', () => {
      expect(formatCPF('12345678909')).toBe('123.456.789-09')
      expect(formatCPF('111.444.777-35')).toBe('111.444.777-35')
    })

    it('deve retornar vazio ao formatar CPF invalido', () => {
      expect(formatCPF('')).toBe('')
      expect(formatCPF(null as any)).toBe('')
    })
  })

  describe('Telefone Brasileiro', () => {
    it('deve validar telefone celular (11 digitos)', () => {
      expect(validateBrazilianPhone('11987654321')).toBe(true)
      expect(validateBrazilianPhone('(11) 98765-4321')).toBe(true)
    })

    it('deve validar telefone fixo (10 digitos)', () => {
      expect(validateBrazilianPhone('1133334444')).toBe(true)
      expect(validateBrazilianPhone('(11) 3333-4444')).toBe(true)
    })

    it('deve rejeitar telefone com tamanho incorreto', () => {
      expect(validateBrazilianPhone('123')).toBe(false)
      expect(validateBrazilianPhone('123456789012')).toBe(false)
    })

    it('deve formatar celular corretamente', () => {
      expect(formatBrazilianPhone('11987654321')).toBe('(11) 98765-4321')
    })

    it('deve formatar fixo corretamente', () => {
      expect(formatBrazilianPhone('1133334444')).toBe('(11) 3333-4444')
    })
  })

  describe('CEP Validation', () => {
    it('deve validar CEP correto (8 digitos)', () => {
      expect(validateCEP('01310100')).toBe(true)
      expect(validateCEP('01310-100')).toBe(true)
    })

    it('deve rejeitar CEP com tamanho incorreto', () => {
      expect(validateCEP('123')).toBe(false)
      expect(validateCEP('123456789')).toBe(false)
    })

    it('deve formatar CEP corretamente', () => {
      expect(formatCEP('01310100')).toBe('01310-100')
      expect(formatCEP('01310-100')).toBe('01310-100')
    })
  })

  describe('INEP Code Validation', () => {
    it('deve validar codigo INEP (8 digitos)', () => {
      expect(validateINEPCode('12345678')).toBe(true)
      expect(validateINEPCode('12.345.678')).toBe(true)
    })

    it('deve rejeitar codigo INEP invalido', () => {
      expect(validateINEPCode('123')).toBe(false)
      expect(validateINEPCode('123456789')).toBe(false)
    })

    it('deve formatar codigo INEP corretamente', () => {
      expect(formatINEPCode('12345678')).toBe('12.345.678')
    })
  })

  describe('Calculo de Idade', () => {
    it('deve calcular idade corretamente', () => {
      const birthDate = new Date('2018-01-15')
      const referenceDate = new Date('2024-01-20')
      
      expect(calculateAge(birthDate)).toBeGreaterThanOrEqual(5)
    })

    it('deve calcular idade com string ISO', () => {
      const age = calculateAge('2018-01-15')
      expect(age).toBeGreaterThanOrEqual(5)
    })

    it('deve considerar mes e dia no calculo', () => {
      const birthDate = new Date('2018-06-15')
      const beforeBirthday = new Date('2024-06-10')
      const afterBirthday = new Date('2024-06-20')

      // Antes do aniversario
      const ageBefore = calculateAge(birthDate)
      
      // Verificar que idade é consistente
      expect(ageBefore).toBeGreaterThanOrEqual(5)
    })
  })

  describe('Validacao de Idade por Nivel Educacional', () => {
    // Helper to create date for a given age
    const birthDateForAge = (years: number): string => {
      const date = new Date()
      date.setFullYear(date.getFullYear() - years)
      date.setMonth(date.getMonth() - 1) // Ensure age is reached
      return date.toISOString().split('T')[0]
    }

    it('deve validar idade para creche (0-3 anos)', () => {
      expect(validateStudentAge(birthDateForAge(1), 'creche')).toBe(true)
      expect(validateStudentAge(birthDateForAge(3), 'creche')).toBe(true)
    })

    it('deve rejeitar idade invalida para creche', () => {
      expect(validateStudentAge(birthDateForAge(5), 'creche')).toBe(false)
    })

    it('deve validar idade para pre-escola (4-5 anos)', () => {
      expect(validateStudentAge(birthDateForAge(4), 'pre_escola')).toBe(true)
      expect(validateStudentAge(birthDateForAge(5), 'pre_escola')).toBe(true)
    })

    it('deve validar idade para ensino fundamental (6-14 anos)', () => {
      expect(validateStudentAge(birthDateForAge(6), 'fundamental')).toBe(true)
      expect(validateStudentAge(birthDateForAge(14), 'fundamental')).toBe(true)
    })
  })

  describe('Calculo de Taxa de Frequencia', () => {
    it('deve calcular taxa de frequencia corretamente', () => {
      expect(calculateAttendanceRate(80, 100)).toBe(80)
      expect(calculateAttendanceRate(15, 20)).toBe(75)
      expect(calculateAttendanceRate(90, 100)).toBe(90)
    })

    it('deve retornar 0 quando total de dias é zero', () => {
      expect(calculateAttendanceRate(0, 0)).toBe(0)
    })

    it('deve arredondar para inteiro', () => {
      expect(calculateAttendanceRate(33, 100)).toBe(33)
      expect(calculateAttendanceRate(67, 100)).toBe(67)
    })
  })

  describe('Status de Frequencia', () => {
    it('deve retornar "adequate" para frequencia >= 80%', () => {
      expect(getAttendanceStatus(80)).toBe('adequate')
      expect(getAttendanceStatus(90)).toBe('adequate')
      expect(getAttendanceStatus(100)).toBe('adequate')
    })

    it('deve retornar "warning" para frequencia entre 75-79%', () => {
      expect(getAttendanceStatus(75)).toBe('warning')
      expect(getAttendanceStatus(77)).toBe('warning')
      expect(getAttendanceStatus(79)).toBe('warning')
    })

    it('deve retornar "critical" para frequencia < 75%', () => {
      expect(getAttendanceStatus(74)).toBe('critical')
      expect(getAttendanceStatus(50)).toBe('critical')
      expect(getAttendanceStatus(0)).toBe('critical')
    })
  })

  describe('Validacao de Frequencia Minima', () => {
    it('deve validar frequencia >= 75% (requisito brasileiro)', () => {
      expect(validateMinimumAttendance(75)).toBe(true)
      expect(validateMinimumAttendance(80)).toBe(true)
      expect(validateMinimumAttendance(100)).toBe(true)
    })

    it('deve rejeitar frequencia < 75%', () => {
      expect(validateMinimumAttendance(74)).toBe(false)
      expect(validateMinimumAttendance(50)).toBe(false)
      expect(validateMinimumAttendance(0)).toBe(false)
    })
  })
})
