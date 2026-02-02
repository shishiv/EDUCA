import { describe, it, expect } from 'vitest'
import {
  levenshteinDistance,
  removeAccents,
  normalizeForFuzzy,
  similarityScore,
  fuzzyMatch,
  findFuzzyMatches,
  fuzzySearchBrazilianName,
  fuzzyCPFSearch,
  fuzzySearchStudent,
} from '@/lib/utils/fuzzy-search'

describe('Fuzzy Search Utilities', () => {
  describe('Levenshtein Distance', () => {
    it('deve calcular distancia zero para strings identicas', () => {
      expect(levenshteinDistance('hello', 'hello')).toBe(0)
      expect(levenshteinDistance('José', 'José')).toBe(0)
    })

    it('deve calcular distancia para strings diferentes', () => {
      expect(levenshteinDistance('cat', 'bat')).toBe(1)
      expect(levenshteinDistance('saturday', 'sunday')).toBe(3)
    })

    it('deve tratar strings vazias', () => {
      expect(levenshteinDistance('', '')).toBe(0)
      expect(levenshteinDistance('test', '')).toBe(4)
      expect(levenshteinDistance('', 'test')).toBe(4)
    })

    it('deve calcular insercoes', () => {
      expect(levenshteinDistance('cat', 'cats')).toBe(1)
    })

    it('deve calcular delecoes', () => {
      expect(levenshteinDistance('cats', 'cat')).toBe(1)
    })

    it('deve calcular substituicoes', () => {
      expect(levenshteinDistance('cat', 'cut')).toBe(1)
    })
  })

  describe('Remocao de Acentos', () => {
    it('deve remover acentos brasileiros', () => {
      expect(removeAccents('José')).toBe('Jose')
      expect(removeAccents('André')).toBe('Andre')
      expect(removeAccents('São Paulo')).toBe('Sao Paulo')
    })

    it('deve remover cedilha', () => {
      expect(removeAccents('ação')).toBe('acao')
      expect(removeAccents('Conceição')).toBe('Conceicao')
    })

    it('deve preservar letras sem acentos', () => {
      expect(removeAccents('Maria')).toBe('Maria')
      expect(removeAccents('Silva')).toBe('Silva')
    })

    it('deve tratar til', () => {
      expect(removeAccents('João')).toBe('Joao')
      expect(removeAccents('manhã')).toBe('manha')
    })
  })

  describe('Normalizacao para Fuzzy', () => {
    it('deve converter para lowercase', () => {
      expect(normalizeForFuzzy('JOSE')).toBe('jose')
      expect(normalizeForFuzzy('Maria Silva')).toBe('maria silva')
    })

    it('deve remover acentos', () => {
      expect(normalizeForFuzzy('José da Silva')).toBe('jose da silva')
    })

    it('deve remover espacos extras', () => {
      expect(normalizeForFuzzy('Jose  da   Silva')).toBe('jose da silva')
    })

    it('deve fazer trim', () => {
      expect(normalizeForFuzzy('  Jose  ')).toBe('jose')
    })

    it('deve combinar todas transformacoes', () => {
      expect(normalizeForFuzzy('  JOSÉ  DA  SILVA  ')).toBe('jose da silva')
    })
  })

  describe('Similarity Score', () => {
    it('deve retornar 1.0 para match exato', () => {
      expect(similarityScore('jose', 'jose')).toBe(1.0)
    })

    it('deve retornar 1.0 para match apos normalizacao', () => {
      expect(similarityScore('José', 'jose')).toBe(1.0)
      expect(similarityScore('JOSE', 'jose')).toBe(1.0)
    })

    it('deve retornar score alto para typos pequenos', () => {
      const score = similarityScore('Maria', 'Meria')
      expect(score).toBeGreaterThan(0.7)
    })

    it('deve retornar score baixo para strings muito diferentes', () => {
      const score = similarityScore('Maria', 'Pedro')
      expect(score).toBeLessThan(0.5)
    })

    it('deve retornar 0.0 para strings completamente diferentes', () => {
      const score = similarityScore('abc', 'xyz')
      expect(score).toBeLessThan(0.2)
    })
  })

  describe('Fuzzy Match', () => {
    it('deve fazer match com threshold padrao (0.7)', () => {
      expect(fuzzyMatch('Jose', 'Jose')).toBe(true)
      expect(fuzzyMatch('Jose', 'José')).toBe(true)
    })

    it('deve rejeitar match abaixo do threshold', () => {
      expect(fuzzyMatch('Maria', 'Pedro')).toBe(false)
    })

    it('deve respeitar threshold customizado', () => {
      expect(fuzzyMatch('Maria', 'Meria', 0.8)).toBe(true)
      expect(fuzzyMatch('Maria', 'Meria', 0.95)).toBe(false)
    })
  })

  describe('Find Fuzzy Matches', () => {
    const students = [
      { id: 1, name: 'José Silva' },
      { id: 2, name: 'José Santos' },
      { id: 3, name: 'Maria Silva' },
      { id: 4, name: 'Pedro Costa' },
    ]

    it('deve encontrar matches e ordenar por score', () => {
      const results = findFuzzyMatches(
        'Jose',
        students,
        (s) => s.name
      )

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].item.name).toContain('José')
      
      // Verificar ordenacao por score (maior primeiro)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })

    it('deve respeitar threshold', () => {
      const results = findFuzzyMatches(
        'Jose',
        students,
        (s) => s.name,
        { threshold: 0.9 }
      )

      // Apenas matches muito proximos
      results.forEach(r => {
        expect(r.score).toBeGreaterThanOrEqual(0.9)
      })
    })

    it('deve limitar numero de resultados', () => {
      const results = findFuzzyMatches(
        'Silva',
        students,
        (s) => s.name,
        { maxResults: 1 }
      )

      expect(results.length).toBeLessThanOrEqual(1)
    })
  })

  describe('Brazilian Name Search', () => {
    it('deve fazer match exato', () => {
      expect(fuzzySearchBrazilianName('Jose Silva', 'Jose Silva')).toBe(true)
    })

    it('deve fazer match ignorando acentos', () => {
      expect(fuzzySearchBrazilianName('Jose', 'José da Silva')).toBe(true)
    })

    it('deve fazer match de nome parcial', () => {
      expect(fuzzySearchBrazilianName('Silva', 'Jose Silva Santos')).toBe(true)
    })

    it('deve fazer match de multiplas partes', () => {
      expect(fuzzySearchBrazilianName('Jose Silva', 'Jose da Silva Santos')).toBe(true)
    })

    it('deve tolerar typos em nomes brasileiros', () => {
      expect(fuzzySearchBrazilianName('Josi', 'José')).toBe(true)
      expect(fuzzySearchBrazilianName('Silve', 'Silva')).toBe(true)
    })

    it('deve rejeitar nomes muito diferentes', () => {
      expect(fuzzySearchBrazilianName('Maria', 'Pedro Costa')).toBe(false)
    })
  })

  describe('CPF Search', () => {
    it('deve fazer match exato de CPF', () => {
      expect(fuzzyCPFSearch('12345678909', '12345678909')).toBe(true)
    })

    it('deve fazer match ignorando formatacao', () => {
      expect(fuzzyCPFSearch('123.456.789-09', '12345678909')).toBe(true)
      expect(fuzzyCPFSearch('12345678909', '123.456.789-09')).toBe(true)
    })

    it('deve fazer match parcial', () => {
      expect(fuzzyCPFSearch('123456', '12345678909')).toBe(true)
    })

    it('deve tolerar typos em queries longas', () => {
      expect(fuzzyCPFSearch('123456789', '123456788')).toBe(true)
    })

    it('deve rejeitar CPFs muito diferentes', () => {
      expect(fuzzyCPFSearch('111111', '999999999')).toBe(false)
    })
  })

  describe('Student Search', () => {
    const student = {
      nome_completo: 'José da Silva',
      cpf: '123.456.789-09',
      matricula: 'MAT001',
    }

    it('deve encontrar por nome exato', () => {
      const result = fuzzySearchStudent('José Silva', student)
      
      expect(result).not.toBe(null)
      expect(result?.matchedField).toBe('nome_completo')
      expect(result?.score).toBeGreaterThan(0.7)
    })

    it('deve encontrar por CPF', () => {
      const result = fuzzySearchStudent('123456789', student)
      
      expect(result).not.toBe(null)
      expect(result?.matchedField).toBe('cpf')
    })

    it('deve encontrar por nome parcial', () => {
      const result = fuzzySearchStudent('Silva', student)
      
      expect(result).not.toBe(null)
    })

    it('deve priorizar match exato (score 1.0)', () => {
      const result = fuzzySearchStudent('José da Silva', student)
      
      expect(result?.score).toBe(1.0)
      expect(result?.matchType).toBe('exact')
    })

    it('deve retornar null para query sem match', () => {
      const result = fuzzySearchStudent('Pedro Costa', student)
      
      expect(result).toBe(null)
    })
  })
})
