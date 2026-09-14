import { expect, it } from 'vitest'
import { downloadFilename } from '@/lib/export/download-filename'

it.each([
  ['frequencia_1º_Ano_A_E2E_2026-08-01_2026-10-31.xlsx', 'frequencia_1o_Ano_A_E2E_2026-08-01_2026-10-31.xlsx'],
  ['frequencia_sintética.pdf', 'frequencia_sintetica.pdf'],
  ['frequencia_synthetic.xlsx', 'frequencia_synthetic.xlsx'],
  ['Turma / diagnóstico.pdf', 'Turma___diagnostico.pdf'],
])('makes only the filename portable: %s', (source, expected) => {
  expect(downloadFilename(source)).toBe(expected)
})
