/**
 * Attendance Report Excel Export
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 *
 * Generates Excel reports for attendance and Bolsa Família compliance
 * using SheetJS (xlsx) library - lightweight alternative to ExcelJS.
 *
 * Note: SheetJS free version has limited styling support.
 * Colors/borders are not available without the Pro version.
 */

import * as XLSX from 'xlsx';
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
// DEFAULT STYLES (kept for API compatibility, not used in SheetJS free)
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
function setColumnWidths(worksheet: XLSX.WorkSheet, widths: number[]): void {
  worksheet['!cols'] = widths.map(w => ({ wch: w }));
}

/**
 * Save workbook to file
 */
function saveWorkbook(workbook: XLSX.WorkBook, filename: string): void {
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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
  const workbook = XLSX.utils.book_new();

  // Build data array
  const data: (string | number)[][] = [];

  // Title rows
  data.push(['Relatório de Frequência']);
  data.push([`${report.turmaNome}${report.turmaSerie ? ` - ${report.turmaSerie}` : ''}`]);
  data.push([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  if (schoolName) {
    data.push([`Escola: ${schoolName}`]);
  }
  data.push([]); // Empty row

  // Summary
  data.push([
    `Total: ${report.totalAlunos} alunos`,
    `Média: ${report.mediaFrequencia}%`,
    `Em Risco: ${report.alunosEmRisco}`,
  ]);
  data.push([]); // Empty row

  // Header row
  data.push(['Nome', 'P', 'F', 'A', 'Total', '%', 'Status']);

  // Data rows
  report.students.forEach((student) => {
    data.push([
      student.nome,
      student.presencas,
      student.faltas,
      student.atestados,
      student.totalAulas,
      student.percentual,
      student.emRisco ? 'RISCO' : 'OK',
    ]);
  });

  data.push([]); // Empty row
  data.push(['Legenda: P = Presença, F = Falta, A = Atestado. Risco = frequência < 80%']);
  data.push([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  setColumnWidths(worksheet, [35, 10, 10, 10, 10, 12, 12]);

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Frequência');

  // Save
  const filename = `frequencia_${report.turmaNome.replace(/\s+/g, '_')}_${report.periodo.inicio}_${report.periodo.fim}`;
  saveWorkbook(workbook, filename);
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
  const workbook = XLSX.utils.book_new();

  // ========================
  // Sheet 1: Resumo
  // ========================
  const summaryData: (string | number)[][] = [];

  summaryData.push(['Relatório Bolsa Família - Resumo']);
  summaryData.push([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  if (schoolName) {
    summaryData.push([`Escola: ${schoolName}`]);
  }
  summaryData.push([]); // Empty row

  summaryData.push(['Métrica', 'Valor']);
  summaryData.push(['Total Bolsa Família', report.resumo.totalAlunosBolsaFamilia]);
  summaryData.push(['Conformes (>85%)', report.resumo.conformes]);
  summaryData.push(['Em Alerta (80-85%)', report.resumo.emAlerta]);
  summaryData.push(['Críticos (<80%)', report.resumo.emRiscoCritico]);
  summaryData.push(['% Conformidade', `${report.resumo.percentualConformidade}%`]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  setColumnWidths(summarySheet, [25, 15]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo');

  // ========================
  // Sheet 2: Alunos
  // ========================
  const studentsData: (string | number)[][] = [];

  studentsData.push(['Relatório Bolsa Família - Alunos']);
  studentsData.push([`Período: ${formatDateBR(report.periodo.inicio)} - ${formatDateBR(report.periodo.fim)}`]);
  studentsData.push([]); // Empty row

  // Header
  studentsData.push(['Nome', 'NIS', 'Turma', 'Escola', 'P', 'F', 'A', 'Total', '%', 'Status']);

  // Filter students
  const studentsToShow = showAllStudents
    ? report.alunos
    : report.alunos.filter((s) => s.status !== 'CONFORME');

  // Data rows
  studentsToShow.forEach((student) => {
    const statusLabel = student.status === 'CRITICO' ? 'CRÍTICO' :
                        student.status === 'ALERTA' ? 'ALERTA' : 'OK';

    studentsData.push([
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
  });

  studentsData.push([]); // Empty row
  studentsData.push(['Legenda: P = Presença, F = Falta, A = Atestado (conta como presença). Crítico = <80%, Alerta = 80-85%.']);
  studentsData.push([`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`]);

  const studentsSheet = XLSX.utils.aoa_to_sheet(studentsData);
  setColumnWidths(studentsSheet, [35, 15, 20, 30, 8, 8, 8, 10, 10, 12]);
  XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Alunos');

  // Save
  const filename = `bolsa_familia_${report.periodo.inicio}_${report.periodo.fim}`;
  saveWorkbook(workbook, filename);
}

// Re-export styles for API compatibility (unused in SheetJS free version)
export { DEFAULT_STYLES, BOLSA_FAMILIA_STYLES };
