import { describe, it, expect } from 'vitest'
import {
  calculateFaixaEtaria,
  getFaixaEtariaInfo,
  isInfantilAge,
  FAIXA_ETARIA_CONFIG,
  type FaixaEtaria,
} from '@/lib/utils/faixa-etaria'

describe('Faixa Etaria (BNCC)', () => {
  describe('Calculo de Faixa Etaria', () => {
    it('deve classificar bebes (0-18 meses)', () => {
      const birthDate = new Date('2023-12-01')
      const referenceDate = new Date('2024-06-01') // 6 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('bebes')
    })

    it('deve classificar criancas bem pequenas (19-47 meses)', () => {
      const birthDate = new Date('2021-01-01')
      const referenceDate = new Date('2023-01-01') // 24 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('criancas-bem-pequenas')
    })

    it('deve classificar criancas pequenas (48-71 meses)', () => {
      const birthDate = new Date('2019-01-01')
      const referenceDate = new Date('2023-05-01') // ~52 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('criancas-pequenas')
    })

    it('deve retornar null para idade fora do range (> 71 meses)', () => {
      const birthDate = new Date('2017-01-01')
      const referenceDate = new Date('2024-01-01') // 7 anos
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe(null)
    })

    it('deve aceitar birth date como string ISO', () => {
      const referenceDate = new Date('2024-06-01')
      
      const result = calculateFaixaEtaria('2023-12-01', referenceDate)
      expect(result).toBe('bebes')
    })

    it('deve usar data atual como referencia quando nao especificada', () => {
      const birthDate = new Date()
      birthDate.setMonth(birthDate.getMonth() - 10) // 10 meses atrás
      
      const result = calculateFaixaEtaria(birthDate)
      expect(result).toBe('bebes')
    })
  })

  describe('Limites de Faixa Etaria', () => {
    it('deve classificar corretamente no limite superior de bebes (18 meses)', () => {
      const birthDate = new Date('2022-12-01')
      const referenceDate = new Date('2024-06-01') // 18 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('bebes')
    })

    it('deve classificar corretamente no limite inferior de criancas bem pequenas (19 meses)', () => {
      const birthDate = new Date('2022-11-01')
      const referenceDate = new Date('2024-06-01') // 19 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('criancas-bem-pequenas')
    })

    it('deve classificar corretamente no limite superior de criancas bem pequenas (47 meses)', () => {
      const birthDate = new Date('2020-07-01')
      const referenceDate = new Date('2024-06-01') // 47 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('criancas-bem-pequenas')
    })

    it('deve classificar corretamente no limite inferior de criancas pequenas (48 meses)', () => {
      const birthDate = new Date('2020-06-01')
      const referenceDate = new Date('2024-06-01') // 48 meses
      
      expect(calculateFaixaEtaria(birthDate, referenceDate)).toBe('criancas-pequenas')
    })
  })

  describe('Informacao Completa de Faixa Etaria', () => {
    it('deve retornar info completa para bebes', () => {
      const birthDate = new Date('2023-12-01')
      const referenceDate = new Date('2024-06-01')
      
      const info = getFaixaEtariaInfo(birthDate, referenceDate)
      
      expect(info).toBeDefined()
      expect(info?.key).toBe('bebes')
      expect(info?.label).toBe('Bebes')
      expect(info?.stage).toBe('Creche')
      expect(info?.minMonths).toBe(0)
      expect(info?.maxMonths).toBe(18)
    })

    it('deve retornar info completa para criancas bem pequenas', () => {
      const birthDate = new Date('2021-01-01')
      const referenceDate = new Date('2023-01-01')
      
      const info = getFaixaEtariaInfo(birthDate, referenceDate)
      
      expect(info).toBeDefined()
      expect(info?.key).toBe('criancas-bem-pequenas')
      expect(info?.stage).toBe('Creche')
      expect(info?.minMonths).toBe(19)
      expect(info?.maxMonths).toBe(47)
    })

    it('deve retornar info completa para criancas pequenas', () => {
      const birthDate = new Date('2019-01-01')
      const referenceDate = new Date('2023-05-01')
      
      const info = getFaixaEtariaInfo(birthDate, referenceDate)
      
      expect(info).toBeDefined()
      expect(info?.key).toBe('criancas-pequenas')
      expect(info?.stage).toBe('Pre-escola')
      expect(info?.minMonths).toBe(48)
      expect(info?.maxMonths).toBe(71)
    })

    it('deve retornar null para idade fora do range', () => {
      const birthDate = new Date('2017-01-01')
      const referenceDate = new Date('2024-01-01')
      
      const info = getFaixaEtariaInfo(birthDate, referenceDate)
      expect(info).toBe(null)
    })
  })

  describe('Validacao de Educacao Infantil', () => {
    it('deve confirmar que bebes estao na educacao infantil', () => {
      const birthDate = new Date('2023-12-01')
      const referenceDate = new Date('2024-06-01')
      
      expect(isInfantilAge(birthDate, referenceDate)).toBe(true)
    })

    it('deve confirmar que criancas pequenas estao na educacao infantil', () => {
      const birthDate = new Date('2019-01-01')
      const referenceDate = new Date('2023-05-01')
      
      expect(isInfantilAge(birthDate, referenceDate)).toBe(true)
    })

    it('deve rejeitar criancas acima do range (> 71 meses)', () => {
      const birthDate = new Date('2017-01-01')
      const referenceDate = new Date('2024-01-01')
      
      expect(isInfantilAge(birthDate, referenceDate)).toBe(false)
    })
  })

  describe('Configuracao BNCC', () => {
    it('deve ter todas as 3 faixas etarias configuradas', () => {
      expect(Object.keys(FAIXA_ETARIA_CONFIG)).toHaveLength(3)
      expect(FAIXA_ETARIA_CONFIG.bebes).toBeDefined()
      expect(FAIXA_ETARIA_CONFIG['criancas-bem-pequenas']).toBeDefined()
      expect(FAIXA_ETARIA_CONFIG['criancas-pequenas']).toBeDefined()
    })

    it('deve ter cores configuradas para cada faixa', () => {
      Object.values(FAIXA_ETARIA_CONFIG).forEach(config => {
        expect(config.color).toBeTruthy()
        expect(config.bgColor).toBeTruthy()
      })
    })

    it('deve ter estagio educacional definido', () => {
      expect(FAIXA_ETARIA_CONFIG.bebes.stage).toBe('Creche')
      expect(FAIXA_ETARIA_CONFIG['criancas-bem-pequenas'].stage).toBe('Creche')
      expect(FAIXA_ETARIA_CONFIG['criancas-pequenas'].stage).toBe('Pre-escola')
    })

    it('deve ter ranges de meses cobrindo 0-71 meses sem gaps', () => {
      expect(FAIXA_ETARIA_CONFIG.bebes.minMonths).toBe(0)
      expect(FAIXA_ETARIA_CONFIG.bebes.maxMonths).toBe(18)
      
      expect(FAIXA_ETARIA_CONFIG['criancas-bem-pequenas'].minMonths).toBe(19)
      expect(FAIXA_ETARIA_CONFIG['criancas-bem-pequenas'].maxMonths).toBe(47)
      
      expect(FAIXA_ETARIA_CONFIG['criancas-pequenas'].minMonths).toBe(48)
      expect(FAIXA_ETARIA_CONFIG['criancas-pequenas'].maxMonths).toBe(71)
    })
  })
})
