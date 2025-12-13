/**
 * Export Utilities for Brazilian Educational Data
 * Supports PDF and Excel export with proper Brazilian formatting
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import ExcelJS from 'exceljs'

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 */
export function formatBrazilianDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format number with Brazilian decimal separator (comma)
 */
export function formatBrazilianNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Export data to Excel/CSV format
 */
export async function exportToExcel(
  data: any[],
  filename: string,
  options: {
    sheetName?: string
    headers?: string[]
    formatDates?: boolean
    formatNumbers?: boolean
  } = {}
) {
  const {
    sheetName = 'Dados',
    headers,
    formatDates = true,
    formatNumbers = true
  } = options

  try {
    // Format data for Brazilian standards
    const formattedData = data.map(row => {
      const formatted: any = {}

      Object.entries(row).forEach(([key, value]) => {
        // Format dates
        if (formatDates && value instanceof Date) {
          formatted[key] = formatBrazilianDate(value)
        }
        // Format numbers
        else if (formatNumbers && typeof value === 'number') {
          formatted[key] = formatBrazilianNumber(value)
        }
        // Keep other values as-is
        else {
          formatted[key] = value
        }
      })

      return formatted
    })

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistema de Gestão Educacional'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet(sheetName)

    // Get headers from first row if not provided
    const columnHeaders = headers || (formattedData.length > 0 ? Object.keys(formattedData[0]) : [])

    // Add header row
    const headerRow = worksheet.addRow(columnHeaders)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' }
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Add data rows
    formattedData.forEach((row, index) => {
      const values = columnHeaders.map(header => row[header] ?? '')
      const dataRow = worksheet.addRow(values)

      // Alternate row colors
      if (index % 2 === 1) {
        dataRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F5F5' }
          }
        })
      }
    })

    // Auto-size columns
    worksheet.columns.forEach((column) => {
      let maxLength = 10
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? String(cell.value) : ''
        maxLength = Math.max(maxLength, cellValue.length)
      })
      column.width = Math.min(maxLength + 2, 50) // Cap at 50
    })

    // Generate file and download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)

    return { success: true, filename: `${filename}.xlsx` }
  } catch (error) {
    console.error('Error exporting to Excel:', error)
    return { success: false, error }
  }
}

/**
 * Export data to CSV format (Educacenso compatible)
 */
export function exportToCSV(
  data: any[],
  filename: string,
  options: {
    separator?: string
    headers?: string[]
    includeHeader?: boolean
  } = {}
) {
  const {
    separator = ';', // Brazilian standard separator
    headers,
    includeHeader = true
  } = options

  try {
    // Get headers from first row if not provided
    const csvHeaders = headers || (data.length > 0 ? Object.keys(data[0]) : [])

    // Build CSV content
    let csv = ''

    // Add headers
    if (includeHeader) {
      csv += csvHeaders.join(separator) + '\n'
    }

    // Add data rows
    data.forEach(row => {
      const values = csvHeaders.map(header => {
        let value = row[header]

        // Format dates
        if (value instanceof Date) {
          value = formatBrazilianDate(value)
        }
        // Format numbers
        else if (typeof value === 'number') {
          value = formatBrazilianNumber(value)
        }
        // Escape quotes and commas
        else if (typeof value === 'string') {
          value = value.replace(/"/g, '""')
          if (value.includes(separator) || value.includes('"')) {
            value = `"${value}"`
          }
        }

        return value ?? ''
      })

      csv += values.join(separator) + '\n'
    })

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${filename}.csv`
    link.click()

    return { success: true, filename: `${filename}.csv` }
  } catch (error) {
    console.error('Error exporting to CSV:', error)
    return { success: false, error }
  }
}

/**
 * Export attendance report to PDF
 */
export function exportAttendanceToPDF(
  data: {
    studentName: string
    cpf?: string
    class: string
    school: string
    period: string
    attendancePercentage: number
    totalDays: number
    presents: number
    absences: number
    details: Array<{
      date: string
      status: 'Presente' | 'Ausente'
    }>
  },
  filename: string = 'relatorio_frequencia'
) {
  try {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(18)
    doc.text('Relatório de Frequência Escolar', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.text(`Gerado em: ${formatBrazilianDate(new Date())}`, 105, 28, { align: 'center' })

    // Student info
    doc.setFontSize(12)
    doc.text('Dados do Aluno', 14, 40)

    doc.setFontSize(10)
    doc.text(`Nome: ${data.studentName}`, 14, 48)
    if (data.cpf) {
      doc.text(`CPF: ${data.cpf}`, 14, 55)
    }
    doc.text(`Turma: ${data.class}`, 14, 62)
    doc.text(`Escola: ${data.school}`, 14, 69)
    doc.text(`Período: ${data.period}`, 14, 76)

    // Attendance summary
    doc.setFontSize(12)
    doc.text('Resumo de Frequência', 14, 88)

    const summaryData = [
      ['Frequência Geral', `${formatBrazilianNumber(data.attendancePercentage, 1)}%`],
      ['Total de Dias Letivos', data.totalDays.toString()],
      ['Dias Presentes', data.presents.toString()],
      ['Dias Ausentes', data.absences.toString()],
    ]

    autoTable(doc, {
      startY: 93,
      head: [['Indicador', 'Valor']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 }
    })

    // Compliance status
    const yAfterSummary = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(12)
    doc.text('Status de Conformidade', 14, yAfterSummary)

    const complianceData = [
      [
        'INEP (Mínimo 75%)',
        data.attendancePercentage >= 75 ? 'Conforme ✓' : 'Não Conforme ✗'
      ],
      [
        'Bolsa Família (Mínimo 80%)',
        data.attendancePercentage >= 80 ? 'Conforme ✓' : 'Atenção Necessária'
      ],
    ]

    autoTable(doc, {
      startY: yAfterSummary + 5,
      head: [['Programa', 'Status']],
      body: complianceData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw.toString().includes('Não Conforme')) {
            data.cell.styles.textColor = [239, 68, 68] // red
          } else if (data.cell.raw.toString().includes('Atenção')) {
            data.cell.styles.textColor = [249, 115, 22] // orange
          } else {
            data.cell.styles.textColor = [34, 197, 94] // green
          }
        }
      }
    })

    // Detailed attendance (if fits on page)
    const yAfterCompliance = (doc as any).lastAutoTable.finalY + 10

    if (yAfterCompliance < 250 && data.details.length > 0) {
      doc.setFontSize(12)
      doc.text('Detalhamento por Data', 14, yAfterCompliance)

      const detailsFormatted = data.details.map(d => [
        formatBrazilianDate(d.date),
        d.status
      ])

      autoTable(doc, {
        startY: yAfterCompliance + 5,
        head: [['Data', 'Status']],
        body: detailsFormatted.slice(0, 20), // Limit to avoid overflow
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14 },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 1) {
            if (data.cell.raw === 'Ausente') {
              data.cell.styles.textColor = [239, 68, 68]
            } else {
              data.cell.styles.textColor = [34, 197, 94]
            }
          }
        }
      })

      if (data.details.length > 20) {
        const yAfterDetails = (doc as any).lastAutoTable.finalY + 5
        doc.setFontSize(8)
        doc.text(
          `* Mostrando apenas os primeiros 20 registros de ${data.details.length} total`,
          14,
          yAfterDetails
        )
      }
    }

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    doc.setFontSize(8)
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        285,
        { align: 'center' }
      )
      doc.text(
        'Município de Fronteira - Gestão Educacional',
        105,
        290,
        { align: 'center' }
      )
    }

    // Save PDF
    doc.save(`${filename}.pdf`)

    return { success: true, filename: `${filename}.pdf` }
  } catch (error) {
    console.error('Error exporting to PDF:', error)
    return { success: false, error }
  }
}

/**
 * Export class roster to PDF
 */
export function exportClassRosterToPDF(
  classData: {
    className: string
    school: string
    teacher: string
    year: number
    students: Array<{
      nome: string
      cpf?: string
      dataNascimento: string
      matricula?: string
    }>
  },
  filename: string = 'lista_turma'
) {
  try {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(18)
    doc.text('Lista de Alunos', 105, 20, { align: 'center' })

    // Class info
    doc.setFontSize(10)
    doc.text(`Turma: ${classData.className}`, 14, 35)
    doc.text(`Escola: ${classData.school}`, 14, 42)
    doc.text(`Professor(a): ${classData.teacher}`, 14, 49)
    doc.text(`Ano Letivo: ${classData.year}`, 14, 56)
    doc.text(`Total de Alunos: ${classData.students.length}`, 14, 63)

    // Students table
    const studentsData = classData.students.map((student, index) => [
      (index + 1).toString(),
      student.nome,
      student.cpf || 'N/A',
      formatBrazilianDate(student.dataNascimento),
      student.matricula || ''
    ])

    autoTable(doc, {
      startY: 70,
      head: [['#', 'Nome', 'CPF', 'Data de Nascimento', 'Matrícula']],
      body: studentsData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 70 },
        2: { cellWidth: 35 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 }
      }
    })

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages()
    doc.setFontSize(8)
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.text(
        `Gerado em: ${formatBrazilianDate(new Date())}`,
        14,
        285
      )
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        285,
        { align: 'center' }
      )
    }

    doc.save(`${filename}.pdf`)

    return { success: true, filename: `${filename}.pdf` }
  } catch (error) {
    console.error('Error exporting class roster:', error)
    return { success: false, error }
  }
}
