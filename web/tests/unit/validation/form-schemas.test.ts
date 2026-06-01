import { describe, it, expect } from 'vitest'
import {
  studentFormSchema,
  userFormSchema,
  schoolFormSchema,
  classFormSchema,
  cpfSchema,
  brazilianPhoneSchema,
  cepSchema,
  academicYearSchema,
  attendanceRateSchema,
  inepCodeSchema,
} from '@/lib/validation/brazilian'

describe('Zod Form Validation Schemas', () => {
  describe('CPF Schema', () => {
    it('deve aceitar CPF valido e formatar', () => {
      const result = cpfSchema.safeParse('12345678909')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toContain('.')
        expect(result.data).toContain('-')
      }
    })

    it('deve rejeitar CPF invalido', () => {
      const result = cpfSchema.safeParse('11111111111')
      
      expect(result.success).toBe(false)
    })
  })

  describe('Brazilian Phone Schema', () => {
    it('deve aceitar e formatar telefone celular', () => {
      const result = brazilianPhoneSchema.safeParse('11987654321')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('(11) 98765-4321')
      }
    })

    it('deve aceitar e formatar telefone fixo', () => {
      const result = brazilianPhoneSchema.safeParse('1133334444')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('(11) 3333-4444')
      }
    })

    it('deve rejeitar telefone invalido', () => {
      const result = brazilianPhoneSchema.safeParse('123')
      
      expect(result.success).toBe(false)
    })
  })

  describe('CEP Schema', () => {
    it('deve aceitar e formatar CEP valido', () => {
      const result = cepSchema.safeParse('01310100')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('01310-100')
      }
    })

    it('deve rejeitar CEP invalido', () => {
      const result = cepSchema.safeParse('123')
      
      expect(result.success).toBe(false)
    })
  })

  describe('Academic Year Schema', () => {
    it('deve aceitar ano letivo atual', () => {
      const currentYear = new Date().getFullYear()
      const result = academicYearSchema.safeParse(currentYear)
      
      expect(result.success).toBe(true)
    })

    it('deve aceitar ano letivo proximo (planejamento)', () => {
      const nextYear = new Date().getFullYear() + 1
      const result = academicYearSchema.safeParse(nextYear)
      
      expect(result.success).toBe(true)
    })

    it('deve rejeitar ano letivo no passado', () => {
      const pastYear = new Date().getFullYear() - 1
      const result = academicYearSchema.safeParse(pastYear)
      
      expect(result.success).toBe(false)
    })

    it('deve rejeitar ano muito no futuro', () => {
      const futureYear = new Date().getFullYear() + 5
      const result = academicYearSchema.safeParse(futureYear)
      
      expect(result.success).toBe(false)
    })
  })

  describe('Attendance Rate Schema', () => {
    it('deve aceitar taxa valida (0-100)', () => {
      expect(attendanceRateSchema.safeParse(80).success).toBe(true)
      expect(attendanceRateSchema.safeParse(0).success).toBe(true)
      expect(attendanceRateSchema.safeParse(100).success).toBe(true)
    })

    it('deve rejeitar taxa negativa', () => {
      const result = attendanceRateSchema.safeParse(-10)
      
      expect(result.success).toBe(false)
    })

    it('deve rejeitar taxa acima de 100', () => {
      const result = attendanceRateSchema.safeParse(150)
      
      expect(result.success).toBe(false)
    })
  })

  describe('INEP Code Schema', () => {
    it('deve aceitar e formatar codigo INEP valido', () => {
      const result = inepCodeSchema.safeParse('12345678')
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('12.345.678')
      }
    })

    it('deve rejeitar codigo INEP invalido', () => {
      const result = inepCodeSchema.safeParse('123')
      
      expect(result.success).toBe(false)
    })
  })

  describe('Student Form Schema', () => {
    const validStudent = {
      nome_completo: 'José da Silva',
      data_nascimento: '2018-01-15',
      sexo: 'M' as const,
      endereco: 'Rua Principal, 123, Centro',
      nome_mae: 'Maria da Silva',
    }

    it('deve aceitar dados validos de aluno', () => {
      const result = studentFormSchema.safeParse(validStudent)
      
      expect(result.success).toBe(true)
    })

    it('deve rejeitar nome muito curto', () => {
      const result = studentFormSchema.safeParse({
        ...validStudent,
        nome_completo: 'J',
      })
      
      expect(result.success).toBe(false)
    })

    it('deve rejeitar data de nascimento no futuro', () => {
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)
      
      const result = studentFormSchema.safeParse({
        ...validStudent,
        data_nascimento: futureDate.toISOString().split('T')[0],
      })
      
      expect(result.success).toBe(false)
    })

    it('deve rejeitar sexo invalido', () => {
      const result = studentFormSchema.safeParse({
        ...validStudent,
        sexo: 'X',
      })
      
      expect(result.success).toBe(false)
    })

    it('deve aceitar campos opcionais vazios', () => {
      const result = studentFormSchema.safeParse({
        ...validStudent,
        cpf: undefined,
        email: undefined,
        telefone: undefined,
      })
      
      expect(result.success).toBe(true)
    })
  })

  describe('User Form Schema', () => {
    const validUser = {
      email: 'professor@escola.com',
      nome: 'Carlos Souza',
      tipo_usuario: 'professor' as const,
    }

    it('deve aceitar dados validos de usuario', () => {
      const result = userFormSchema.safeParse(validUser)
      
      expect(result.success).toBe(true)
    })

    it('deve rejeitar email invalido', () => {
      const result = userFormSchema.safeParse({
        ...validUser,
        email: 'email-invalido',
      })
      
      expect(result.success).toBe(false)
    })

    it('deve aceitar todos tipos de usuario', () => {
      const tipos = ['admin', 'diretor', 'secretario', 'professor', 'responsavel']
      
      tipos.forEach(tipo => {
        const result = userFormSchema.safeParse({
          ...validUser,
          tipo_usuario: tipo,
        })
        
        expect(result.success).toBe(true)
      })
    })

    it('deve rejeitar tipo de usuario invalido', () => {
      const result = userFormSchema.safeParse({
        ...validUser,
        tipo_usuario: 'invalid_type',
      })
      
      expect(result.success).toBe(false)
    })
  })

  describe('School Form Schema', () => {
    const validSchool = {
      nome: 'Escola Municipal Centro',
      codigo: 'ESC001',
      endereco: 'Rua das Escolas, 100, Centro',
      telefone: '1133334444',
      tipo: 'fundamental' as const,
    }

    it('deve aceitar dados validos de escola', () => {
      const result = schoolFormSchema.safeParse(validSchool)
      
      expect(result.success).toBe(true)
    })

    it('deve aceitar todos tipos de escola', () => {
      const tipos = ['creche', 'pre_escola', 'fundamental']
      
      tipos.forEach(tipo => {
        const result = schoolFormSchema.safeParse({
          ...validSchool,
          tipo,
        })
        
        expect(result.success).toBe(true)
      })
    })

    it('deve validar e formatar telefone', () => {
      const result = schoolFormSchema.safeParse(validSchool)
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.telefone).toContain('(')
        expect(result.data.telefone).toContain(')')
      }
    })

    it('deve aceitar codigo INEP opcional', () => {
      const result = schoolFormSchema.safeParse({
        ...validSchool,
        codigo_inep: '12345678',
      })
      
      expect(result.success).toBe(true)
    })
  })

  describe('Class Form Schema', () => {
    const validClass = {
      nome: '1º Ano A',
      ano_letivo: new Date().getFullYear(),
      serie: '1º ano',
      escola_id: '550e8400-e29b-41d4-a716-446655440000',
      capacidade: 25,
      turno: 'matutino' as const,
    }

    it('deve aceitar dados validos de turma', () => {
      const result = classFormSchema.safeParse(validClass)
      
      expect(result.success).toBe(true)
    })

    it('deve aceitar todos turnos', () => {
      const turnos = ['matutino', 'vespertino', 'integral']
      
      turnos.forEach(turno => {
        const result = classFormSchema.safeParse({
          ...validClass,
          turno,
        })
        
        expect(result.success).toBe(true)
      })
    })

    it('deve validar capacidade minima (>= 1)', () => {
      const result = classFormSchema.safeParse({
        ...validClass,
        capacidade: 0,
      })
      
      expect(result.success).toBe(false)
    })

    it('deve validar capacidade maxima (<= 50)', () => {
      const result = classFormSchema.safeParse({
        ...validClass,
        capacidade: 51,
      })
      
      expect(result.success).toBe(false)
    })

    it('deve validar formato UUID para escola_id', () => {
      const result = classFormSchema.safeParse({
        ...validClass,
        escola_id: 'invalid-uuid',
      })
      
      expect(result.success).toBe(false)
    })

    it('deve aceitar professor_id opcional', () => {
      const result = classFormSchema.safeParse({
        ...validClass,
        professor_id: '550e8400-e29b-41d4-a716-446655440001',
      })
      
      expect(result.success).toBe(true)
    })
  })
})
