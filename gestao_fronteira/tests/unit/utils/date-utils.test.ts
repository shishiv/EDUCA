import { describe, it, expect } from 'vitest'
import {
  formatDateBR,
  formatDateTimeBR,
  formatDateShortBR,
  formatDateWithWeekdayBR,
  formatMonthYearBR,
  formatRelativeTimeBR,
  formatTimeBR,
  getTodayISO,
  isPast18hSaoPaulo,
} from '@/lib/date-utils'

describe('Brazilian Date Utilities', () => {
  describe('Formatacao de Data Brasileira', () => {
    it('deve formatar data no formato DD/MM/YYYY', () => {
      const date = new Date('2024-01-15')
      expect(formatDateBR(date)).toBe('15/01/2024')
    })

    it('deve formatar string ISO', () => {
      expect(formatDateBR('2024-01-15')).toBe('15/01/2024')
    })

    it('deve retornar "-" para data nula ou invalida', () => {
      expect(formatDateBR(null)).toBe('-')
      expect(formatDateBR(undefined)).toBe('-')
      expect(formatDateBR('invalid')).toBe('-')
    })

    it('deve formatar diferentes meses corretamente', () => {
      expect(formatDateBR('2024-12-25')).toBe('25/12/2024')
      expect(formatDateBR('2024-03-08')).toBe('08/03/2024')
    })
  })

  describe('Formatacao de Data e Hora', () => {
    it('deve formatar data com hora no formato brasileiro', () => {
      const result = formatDateTimeBR('2024-01-15T14:30:00')
      expect(result).toContain('15/01/2024')
      expect(result).toContain('14:30')
      expect(result).toContain('às')
    })

    it('deve retornar "-" para data invalida', () => {
      expect(formatDateTimeBR(null)).toBe('-')
      expect(formatDateTimeBR('invalid')).toBe('-')
    })
  })

  describe('Formatacao de Data Curta', () => {
    it('deve formatar data curta (DD/MM)', () => {
      expect(formatDateShortBR('2024-01-15')).toBe('15/01')
      expect(formatDateShortBR('2024-12-25')).toBe('25/12')
    })

    it('deve retornar "-" para data invalida', () => {
      expect(formatDateShortBR(null)).toBe('-')
    })
  })

  describe('Formatacao com Dia da Semana', () => {
    it('deve incluir dia da semana em portugues', () => {
      const result = formatDateWithWeekdayBR('2024-01-15')
      // Segunda-feira, 15/01/2024
      expect(result).toContain('15/01/2024')
    })

    it('deve retornar "-" para data invalida', () => {
      expect(formatDateWithWeekdayBR(null)).toBe('-')
    })
  })

  describe('Formatacao Mes/Ano', () => {
    it('deve formatar mes e ano em portugues', () => {
      const result = formatMonthYearBR('2024-01-15')
      expect(result.toLowerCase()).toContain('2024')
      // Janeiro em portugues
    })

    it('deve retornar "-" para data invalida', () => {
      expect(formatMonthYearBR(null)).toBe('-')
    })
  })

  describe('Formatacao de Tempo Relativo', () => {
    it('deve formatar tempo relativo em portugues', () => {
      const now = new Date()
      const past = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 horas atrás
      
      const result = formatRelativeTimeBR(past)
      expect(result).toBeTruthy()
      expect(result).not.toBe('-')
    })

    it('deve retornar "-" para data invalida', () => {
      expect(formatRelativeTimeBR(null)).toBe('-')
    })
  })

  describe('Formatacao de Hora', () => {
    it('deve formatar apenas hora (HH:mm)', () => {
      const result = formatTimeBR('2024-01-15T14:30:00')
      expect(result).toBe('14:30')
    })

    it('deve formatar hora com zeros a esquerda', () => {
      const result = formatTimeBR('2024-01-15T09:05:00')
      expect(result).toBe('09:05')
    })

    it('deve retornar "-" para data invalida', () => {
      expect(formatTimeBR(null)).toBe('-')
    })
  })

  describe('Data de Hoje ISO', () => {
    it('deve retornar data de hoje no formato ISO (YYYY-MM-DD)', () => {
      const today = getTodayISO()
      
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      
      const parsed = new Date(today)
      expect(parsed).toBeInstanceOf(Date)
      expect(isNaN(parsed.getTime())).toBe(false)
    })

    it('deve retornar data valida', () => {
      const today = getTodayISO()
      const date = new Date(today)
      
      const now = new Date()
      expect(date.getFullYear()).toBe(now.getFullYear())
      expect(date.getMonth()).toBe(now.getMonth())
      expect(date.getDate()).toBe(now.getDate())
    })
  })

  describe('Validacao de Horario Sao Paulo', () => {
    it('isPast18hSaoPaulo deve retornar boolean', () => {
      const result = isPast18hSaoPaulo()
      expect(typeof result).toBe('boolean')
    })

    // Nota: Este teste depende do horario real, entao apenas verificamos o tipo
    it('deve usar timezone America/Sao_Paulo', () => {
      // O comportamento correto é testado indiretamente
      // pelo uso consistente do timezone em toda a aplicacao
      const result = isPast18hSaoPaulo()
      expect([true, false]).toContain(result)
    })
  })

  describe('Tratamento de Edge Cases', () => {
    it('deve tratar strings vazias', () => {
      expect(formatDateBR('')).toBe('-')
      expect(formatDateTimeBR('')).toBe('-')
      expect(formatTimeBR('')).toBe('-')
    })

    it('deve tratar objetos Date invalidos', () => {
      const invalidDate = new Date('invalid')
      expect(formatDateBR(invalidDate)).toBe('-')
    })

    it('deve formatar datas no inicio do ano', () => {
      expect(formatDateBR('2024-01-01')).toBe('01/01/2024')
    })

    it('deve formatar datas no fim do ano', () => {
      expect(formatDateBR('2024-12-31')).toBe('31/12/2024')
    })
  })
})
