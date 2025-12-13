/**
 * Attendance Report Excel Export
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 *
 * Generates Excel reports for attendance and Bolsa Família compliance
 * using ExcelJS library - full styling support included.
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
 * Set column widths for a worksheet
 */
function setColumnWidths(worksheet: ExcelJS.Worksheet, widths: number[]): void {
  widths.forEach((width, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = width;
  });
}

/**
 * Apply header styling to a row
 */
function styleHeaderRow(row: ExcelJS.Row, bgColor: string = '2980B9'): void {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor },
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
 * Save workbook to file
 */
async function saveWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const name = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  saveAs(blob, name);
}

/**
 * Get status text based on percentage
 */
function getStatusText(percentual: number): string {
  if (percentual < 80) return 'RISCO';
  if (percentual < 85) return 'ALERTA';
  return 'OK';
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

  // Title rows
  worksheet.addRow(['Relatório de Frequência']);
  worksheet.addRow([`${report.turmaNome}${report.turmaSerie ? ` - ${report.turmaSerie}` : ''}`]);
  worksheet.addRow([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  if (schoolName) {
    worksheet.addRow([`Escola: ${schoolName}`]);
  }
  worksheet.addRow([]); // Empty row

  // Summary
  worksheet.addRow([
    `Total: ${report.totalAlunos} alunos`,
    `Média: ${report.mediaFrequencia}%`,
    `Em Risco: ${report.alunosEmRisco}`,
  ]);
  worksheet.addRow([]); // Empty row

  // Header row
  const headerRow = worksheet.addRow(['Nome', 'P', 'F', 'A', 'Total', '%', 'Status']);
  styleHeaderRow(headerRow);

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

    // Alternate row colors
    if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      });
    }

    // Highlight risk students
    if (student.emRisco) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      });
    }
  });

  worksheet.addRow([]); // Empty row
  worksheet.addRow(['Legenda: P = Presença, F = Falta, A = Atestado. Risco = frequência < 80%']);
  worksheet.addRow([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);

  // Set column widths
  setColumnWidths(worksheet, [35, 10, 10, 10, 10, 12, 12]);

  // Style title
  worksheet.getRow(1).font = { bold: true, size: 14 };

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

  // ========================
  // Sheet 1: Resumo
  // ========================
  const summarySheet = workbook.addWorksheet('Resumo');

  summarySheet.addRow(['Relatório Bolsa Família - Resumo']);
  summarySheet.getRow(1).font = { bold: true, size: 14 };

  summarySheet.addRow([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  if (schoolName) {
    summarySheet.addRow([`Escola: ${schoolName}`]);
  }
  summarySheet.addRow([]); // Empty row

  const summaryHeaderRow = summarySheet.addRow(['Métrica', 'Valor']);
  styleHeaderRow(summaryHeaderRow, 'D97706');

  summarySheet.addRow(['Total Bolsa Família', report.resumo.totalAlunosBolsaFamilia]);
  summarySheet.addRow(['Conformes (>85%)', report.resumo.conformes]);
  summarySheet.addRow(['Em Alerta (80-85%)', report.resumo.emAlerta]);
  summarySheet.addRow(['Críticos (<80%)', report.resumo.emRiscoCritico]);
  summarySheet.addRow(['% Conformidade', `${report.resumo.percentualConformidade}%`]);

  setColumnWidths(summarySheet, [25, 15]);

  // ========================
  // Sheet 2: Alunos
  // ========================
  const studentsSheet = workbook.addWorksheet('Alunos');

  studentsSheet.addRow(['Relatório Bolsa Família - Alunos']);
  studentsSheet.getRow(1).font = { bold: true, size: 14 };

  studentsSheet.addRow([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  studentsSheet.addRow([]); // Empty row

  // Header
  const studentsHeaderRow = studentsSheet.addRow(['Nome', 'NIS', 'Turma', 'Escola', 'P', 'F', 'A', 'Total', '%', 'Status']);
  styleHeaderRow(studentsHeaderRow, 'D97706');

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

    // Color coding based on status
    if (student.status === 'CRITICO') {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEE2E2' },
        };
      });
    } else if (student.status === 'ALERTA') {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF3C7' },
        };
      });
    } else if (index % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF5F5F5' },
        };
      });
    }
  });

  studentsSheet.addRow([]); // Empty row
  studentsSheet.addRow(['Legenda: P = Presença, F = Falta, A = Atestado (conta como presença). Crítico = <80%, Alerta = 80-85%.']);
  studentsSheet.addRow([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);

  setColumnWidths(studentsSheet, [35, 15, 20, 30, 8, 8, 8, 10, 10, 12]);

  // Save
  const filename = `bolsa_familia_${report.periodo.inicio}_${report.periodo.fim}`;
  await saveWorkbook(workbook, filename);
}

// Re-export styles for API compatibility
export { DEFAULT_STYLES, BOLSA_FAMILIA_STYLES };
