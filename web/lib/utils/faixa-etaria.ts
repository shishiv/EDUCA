/**
 * Faixa Etaria (Age Group) utilities for BNCC Early Childhood Education
 *
 * Source: BNCC Official Document - Age Group Definitions
 * - Bebes: 0 to 1 year 6 months (0-18 months)
 * - Criancas bem pequenas: 1 year 7 months to 3 years 11 months (19-47 months)
 * - Criancas pequenas: 4 years to 5 years 11 months (48-71 months)
 */

import { differenceInMonths, parseISO } from 'date-fns'

export type FaixaEtaria = 'bebes' | 'criancas-bem-pequenas' | 'criancas-pequenas'

export interface FaixaEtariaInfo {
  key: FaixaEtaria
  label: string
  description: string
  minMonths: number
  maxMonths: number
  color: string
  bgColor: string
  stage: 'Creche' | 'Pre-escola'
}

export const FAIXA_ETARIA_CONFIG: Record<FaixaEtaria, FaixaEtariaInfo> = {
  bebes: {
    key: 'bebes',
    label: 'Bebes',
    description: '0 a 1 ano e 6 meses',
    minMonths: 0,
    maxMonths: 18,
    color: '#f97316', // orange-500
    bgColor: '#fff7ed', // orange-50
    stage: 'Creche',
  },
  'criancas-bem-pequenas': {
    key: 'criancas-bem-pequenas',
    label: 'Criancas bem pequenas',
    description: '1 ano e 7 meses a 3 anos e 11 meses',
    minMonths: 19,
    maxMonths: 47,
    color: '#8b5cf6', // violet-500
    bgColor: '#f5f3ff', // violet-50
    stage: 'Creche',
  },
  'criancas-pequenas': {
    key: 'criancas-pequenas',
    label: 'Criancas pequenas',
    description: '4 anos a 5 anos e 11 meses',
    minMonths: 48,
    maxMonths: 71,
    color: '#0ea5e9', // sky-500
    bgColor: '#f0f9ff', // sky-50
    stage: 'Pre-escola',
  },
}

/**
 * Calculate the faixa etaria (age group) for a child based on birth date.
 *
 * @param birthDate - The child's birth date (Date object or ISO string)
 * @param referenceDate - Optional reference date for calculation (defaults to today)
 * @returns The FaixaEtaria key or null if outside early childhood range (0-71 months)
 */
export function calculateFaixaEtaria(
  birthDate: Date | string,
  referenceDate: Date = new Date()
): FaixaEtaria | null {
  const birth = typeof birthDate === 'string' ? parseISO(birthDate) : birthDate
  const ageInMonths = differenceInMonths(referenceDate, birth)

  if (ageInMonths >= 0 && ageInMonths <= 18) return 'bebes'
  if (ageInMonths >= 19 && ageInMonths <= 47) return 'criancas-bem-pequenas'
  if (ageInMonths >= 48 && ageInMonths <= 71) return 'criancas-pequenas'

  return null // Outside early childhood range
}

/**
 * Get the complete faixa etaria info for a child.
 *
 * @param birthDate - The child's birth date
 * @param referenceDate - Optional reference date for calculation
 * @returns The FaixaEtariaInfo object or null if outside range
 */
export function getFaixaEtariaInfo(
  birthDate: Date | string,
  referenceDate: Date = new Date()
): FaixaEtariaInfo | null {
  const faixa = calculateFaixaEtaria(birthDate, referenceDate)
  return faixa ? FAIXA_ETARIA_CONFIG[faixa] : null
}

/**
 * Check if a child is within the Educacao Infantil age range (0-71 months / 0-5 years 11 months).
 *
 * @param birthDate - The child's birth date
 * @param referenceDate - Optional reference date for calculation
 * @returns True if child is in Educacao Infantil age range
 */
export function isInfantilAge(
  birthDate: Date | string,
  referenceDate: Date = new Date()
): boolean {
  return calculateFaixaEtaria(birthDate, referenceDate) !== null
}
