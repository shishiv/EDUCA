import { describe, expect, it } from 'vitest'
import {
  calculateFaltasParaCritico,
  calculatePresencasSemAtestados,
} from '@/lib/reports/bolsa-familia-reports'

describe('Bolsa Família auxiliary display projection', () => {
  it('keeps atestados out of the displayed presencas while retaining them in the critical-margin forecast', () => {
    const presencasSemAtestados = calculatePresencasSemAtestados(8, 2)

    expect(presencasSemAtestados).toBe(6)
    expect(calculateFaltasParaCritico(presencasSemAtestados, 2, 2, 80)).toBe(1)
  })

  it('does not produce a negative presence bucket from inconsistent source counters', () => {
    expect(calculatePresencasSemAtestados(1, 2)).toBe(0)
  })
})
