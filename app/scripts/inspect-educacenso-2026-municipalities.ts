import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import process from 'node:process'

import ExcelJS from 'exceljs'

const EXPECTED_SHA256 =
  'cea115117f79a697f3402eb67133976788544399b15c9789bcd9fe2ad08d80a3'
const EXPECTED_COUNT = 5_571

async function main(): Promise<void> {
  const filePath = process.argv[2]
  if (!filePath) {
    throw new Error(
      'Uso: pnpm exec tsx scripts/inspect-educacenso-2026-municipalities.ts <Tabela de Municípios 2026.xlsx>'
    )
  }

  const bytes = await readFile(filePath)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(`Hash inesperado para a tabela oficial: ${sha256}`)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(filePath)
  const worksheet = workbook.getWorksheet('Planilha1')
  if (!worksheet) throw new Error('A planilha oficial Planilha1 não foi encontrada.')

  const header = String(worksheet.getCell('C8').value ?? '')
  if (header !== 'Código do município') {
    throw new Error(`Cabeçalho oficial inesperado em C8: ${header}`)
  }

  const codes: string[] = []
  const rowsByCode = new Map<string, number>()
  for (let rowNumber = 9; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const value = String(worksheet.getCell(`C${rowNumber}`).value ?? '')
    if (!/^\d{7}$/.test(value)) {
      throw new Error(`Código inválido na linha oficial ${rowNumber}: ${value}`)
    }
    codes.push(value)
    rowsByCode.set(value, rowNumber)
  }

  if (codes.length !== EXPECTED_COUNT || new Set(codes).size !== EXPECTED_COUNT) {
    throw new Error(
      `Catálogo inesperado: ${codes.length} linhas e ${new Set(codes).size} códigos únicos.`
    )
  }
  if (codes.some((code, index) => index > 0 && codes[index - 1] >= code)) {
    throw new Error('Os códigos da tabela oficial não estão em ordem estritamente crescente.')
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        sha256,
        count: codes.length,
        firstCode: codes[0],
        lastCode: codes.at(-1),
        syntheticFixtureEvidence: {
          '2704302': rowsByCode.get('2704302'),
          '5300108': rowsByCode.get('5300108'),
        },
      },
      null,
      2
    )}\n`
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
})
