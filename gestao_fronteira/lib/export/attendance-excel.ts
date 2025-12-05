/**
 * Attendance Report Excel Export
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 *
 * Generates Excel reports for attendance and Bolsa Família compliance
 * using ExcelJS library.
 */

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ClassAttendanceReport } from '@/lib/reports/attendance-reports';
import type { BolsaFamiliaReport } from '@/lib/reports/bolsa-familia-reports';

// ============================================================================
// TYPES
// ============================================================================

export interface ExcelStyles {
  headerBgColor: string;
  headerTextColor: string;
  alternateBgColor: string;
  riskBgColor: string;
  warningBgColor: string;
  successBgColor: string;
}

// ============================================================================
// DEFAULT STYLES
// ============================================================================

const DEFAULT_STYLES: ExcelStyles = {
  headerBgColor: 'FF2980B9',
  headerTextColor: 'FFFFFFFF',
  alternateBgColor: 'FFF5F5F5',
  riskBgColor: 'FFFEE2E2',
  warningBgColor: 'FFFEF3C7',
  successBgColor: 'FFDCFCE7',
};

const BOLSA_FAMILIA_STYLES: ExcelStyles = {
  headerBgColor: 'FFD97706',
  headerTextColor: 'FFFFFFFF',
  alternateBgColor: 'FFFEF3C7',
  riskBgColor: 'FFFEE2E2',
  warningBgColor: 'FFFEF3C7',
  successBgColor: 'FFDCFCE7',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date for Brazilian locale
 */
function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Apply header style to a row
 */
function applyHeaderStyle(row: ExcelJS.Row, styles: ExcelStyles): void {
  row.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: styles.headerBgColor },
    };
    cell.font = {
      bold: true,
      color: { argb: styles.headerTextColor },
    };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
}

/**
 * Apply data row style
 */
function applyDataRowStyle(row: ExcelJS.Row, isAlternate: boolean, styles: ExcelStyles): void {
  row.eachCell((cell) => {
    if (isAlternate) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: styles.alternateBgColor },
      };
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle' };
  });
}

/**
 * Apply risk-based background color to a cell
 */
function applyRiskColor(cell: ExcelJS.Cell, percentual: number, styles: ExcelStyles): void {
  if (percentual < 80) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: styles.riskBgColor },
    };
  } else if (percentual < 85) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: styles.warningBgColor },
    };
  } else {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: styles.successBgColor },
    };
  }
}

/**
 * Add title row to worksheet
 */
function addTitleRow(worksheet: ExcelJS.Worksheet, title: string, colCount: number): void {
  const titleRow = worksheet.addRow([title]);
  worksheet.mergeCells(titleRow.number, 1, titleRow.number, colCount);
  titleRow.getCell(1).font = { bold: true, size: 14 };
  titleRow.getCell(1).alignment = { horizontal: 'center' };
  titleRow.height = 25;
}

/**
 * Add subtitle row to worksheet
 */
function addSubtitleRow(worksheet: ExcelJS.Worksheet, subtitle: string, colCount: number): void {
  const subtitleRow = worksheet.addRow([subtitle]);
  worksheet.mergeCells(subtitleRow.number, 1, subtitleRow.number, colCount);
  subtitleRow.getCell(1).font = { size: 11, italic: true };
  subtitleRow.getCell(1).alignment = { horizontal: 'center' };
}

/**
 * Save workbook to file
 */
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  saveAs(blob, name);
}

// ============================================================================
// ATTENDANCE REPORT EXCEL
// ============================================================================

/**
 * Generate Excel for class attendance report
 */
export async function generateAttendanceReportExcel(
  report: ClassAttendanceReport,
  schoolName?: string
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestão Educacional';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Frequência');

  // Column widths
  worksheet.columns = [
    { width: 35 }, // Nome
    { width: 10 }, // P
    { width: 10 }, // F
    { width: 10 }, // A
    { width: 10 }, // Total
    { width: 12 }, // %
    { width: 12 }, // Status
  ];

  const colCount = 7;

  // Title
  addTitleRow(worksheet, 'Relatório de Frequência', colCount);

  // Subtitle with class info
  addSubtitleRow(
    worksheet,
    `${report.turmaNome}${report.turmaSerie ? ` - ${report.turmaSerie}` : ''}`,
    colCount
  );

  // Period
  addSubtitleRow(
    worksheet,
    `Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`,
    colCount
  );

  if (schoolName) {
    addSubtitleRow(worksheet, `Escola: ${schoolName}`, colCount);
  }

  // Empty row
  worksheet.addRow([]);

  // Summary row
  const summaryRow = worksheet.addRow([
    `Total: ${report.totalAlunos} alunos`,
    `Média: ${report.mediaFrequencia}%`,
    `Em Risco: ${report.alunosEmRisco}`,
  ]);
  worksheet.mergeCells(summaryRow.number, 1, summaryRow.number, 2);
  worksheet.mergeCells(summaryRow.number, 3, summaryRow.number, 5);
  worksheet.mergeCells(summaryRow.number, 6, summaryRow.number, 7);
  summaryRow.eachCell((cell) => {
    cell.font = { bold: true };
  });

  // Empty row
  worksheet.addRow([]);

  // Header row
  const headerRow = worksheet.addRow(['Nome', 'P', 'F', 'A', 'Total', '%', 'Status']);
  applyHeaderStyle(headerRow, DEFAULT_STYLES);

  // Data rows
  report.students.forEach((student, index) => {
    const row = worksheet.addRow([
      student.nome,
      student.presencas,
      student.faltas,
      student.atestados,
      student.totalAulas,
      student.percentual,
      student.emRisco ? 'RISCO' : 'OK',
    ]);

    applyDataRowStyle(row, index % 2 === 1, DEFAULT_STYLES);

    // Apply risk color to percentage cell
    applyRiskColor(row.getCell(6), student.percentual, DEFAULT_STYLES);

    // Center align numbers
    [2, 3, 4, 5, 6, 7].forEach((col) => {
      row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });

  // Empty row
  worksheet.addRow([]);

  // Legend
  const legendRow = worksheet.addRow(['Legenda: P = Presença, F = Falta, A = Atestado. Risco = frequência < 80%']);
  worksheet.mergeCells(legendRow.number, 1, legendRow.number, colCount);
  legendRow.getCell(1).font = { italic: true, size: 9 };

  // Generated at
  const generatedRow = worksheet.addRow([
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
  ]);
  worksheet.mergeCells(generatedRow.number, 1, generatedRow.number, colCount);
  generatedRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF888888' } };

  // Save
  const filename = `frequencia_${report.turmaNome.replace(/\s+/g, '_')}_${report.periodo.inicio}_${report.periodo.fim}`;
  await saveWorkbook(workbook, filename);
}

// ============================================================================
// BOLSA FAMÍLIA REPORT EXCEL
// ============================================================================

/**
 * Generate Excel for Bolsa Família compliance report
 */
export async function generateBolsaFamiliaReportExcel(
  report: BolsaFamiliaReport,
  schoolName?: string,
  showAllStudents = true
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestão Educacional';
  workbook.created = new Date();

  // Sheet 1: Resumo
  const summarySheet = workbook.addWorksheet('Resumo');
  summarySheet.columns = [
    { width: 25 },
    { width: 15 },
  ];

  addTitleRow(summarySheet, 'Relatório Bolsa Família - Resumo', 2);
  addSubtitleRow(
    summarySheet,
    `Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`,
    2
  );
  if (schoolName) {
    addSubtitleRow(summarySheet, `Escola: ${schoolName}`, 2);
  }
  summarySheet.addRow([]);

  const summaryData = [
    ['Total Bolsa Família', report.resumo.totalAlunosBolsaFamilia],
    ['Conformes (>85%)', report.resumo.conformes],
    ['Em Alerta (80-85%)', report.resumo.emAlerta],
    ['Críticos (<80%)', report.resumo.emRiscoCritico],
    ['% Conformidade', `${report.resumo.percentualConformidade}%`],
  ];

  summaryData.forEach(([label, value]) => {
    const row = summarySheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(2).alignment = { horizontal: 'center' };
  });

  // Sheet 2: Alunos
  const studentsSheet = workbook.addWorksheet('Alunos');
  studentsSheet.columns = [
    { width: 35 }, // Nome
    { width: 15 }, // NIS
    { width: 20 }, // Turma
    { width: 30 }, // Escola
    { width: 8 },  // P
    { width: 8 },  // F
    { width: 8 },  // A
    { width: 10 }, // Total
    { width: 10 }, // %
    { width: 12 }, // Status
  ];

  const colCount = 10;

  addTitleRow(studentsSheet, 'Relatório Bolsa Família - Alunos', colCount);
  addSubtitleRow(
    studentsSheet,
    `Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`,
    colCount
  );
  studentsSheet.addRow([]);

  // Header
  const headerRow = studentsSheet.addRow([
    'Nome', 'NIS', 'Turma', 'Escola', 'P', 'F', 'A', 'Total', '%', 'Status',
  ]);
  applyHeaderStyle(headerRow, BOLSA_FAMILIA_STYLES);

  // Filter students
  const studentsToShow = showAllStudents
    ? report.alunos
    : report.alunos.filter((s) => s.status !== 'CONFORME');

  // Data rows
  studentsToShow.forEach((student, index) => {
    const statusLabel = student.status === 'CRITICO' ? 'CRÍTICO' :
                        student.status === 'ALERTA' ? 'ALERTA' : 'OK';

    const row = studentsSheet.addRow([
      student.nome,
      student.nis || '-',
      student.turmaNome,
      student.escolaNome,
      student.presencas,
      student.faltas,
      student.atestados,
      student.totalAulas,
      student.percentual,
      statusLabel,
    ]);

    applyDataRowStyle(row, index % 2 === 1, BOLSA_FAMILIA_STYLES);
    applyRiskColor(row.getCell(9), student.percentual, BOLSA_FAMILIA_STYLES);

    // Center align numbers
    [5, 6, 7, 8, 9, 10].forEach((col) => {
      row.getCell(col).alignment = { horizontal: 'center', vertical: 'middle' };
    });
  });

  // Legend
  studentsSheet.addRow([]);
  const legendRow = studentsSheet.addRow([
    'Legenda: P = Presença, F = Falta, A = Atestado (conta como presença). Crítico = <80%, Alerta = 80-85%.',
  ]);
  studentsSheet.mergeCells(legendRow.number, 1, legendRow.number, colCount);
  legendRow.getCell(1).font = { italic: true, size: 9 };

  // Generated at
  const generatedRow = studentsSheet.addRow([
    `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
  ]);
  studentsSheet.mergeCells(generatedRow.number, 1, generatedRow.number, colCount);
  generatedRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF888888' } };

  // Save
  const filename = `bolsa_familia_${report.periodo.inicio}_${report.periodo.fim}`;
  await saveWorkbook(workbook, filename);
}
