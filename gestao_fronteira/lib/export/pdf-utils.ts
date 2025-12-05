/**
 * PDF Export Utilities
 * OpenSpec Change: 2025-12-04-diario-de-classe
 * Task Group 4.3: Exportacao PDF e Excel
 *
 * Utilities for generating PDF reports with consistent formatting
 * for Brazilian educational system.
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================================================
// TYPES
// ============================================================================

export interface PDFHeader {
  title: string;
  subtitle?: string;
  schoolName?: string;
  schoolLogo?: string; // Base64 image
  period?: {
    start: string;
    end: string;
  };
  generatedAt?: Date;
}

export interface PDFFooter {
  showPageNumbers?: boolean;
  showGeneratedAt?: boolean;
  customText?: string;
}

export interface PDFTableColumn {
  header: string;
  dataKey: string;
  width?: number;
  halign?: 'left' | 'center' | 'right';
}

export interface PDFTableData {
  columns: PDFTableColumn[];
  rows: Record<string, any>[];
  title?: string;
  summary?: string;
}

export interface PDFStyles {
  primaryColor?: [number, number, number];
  headerBgColor?: [number, number, number];
  headerTextColor?: [number, number, number];
  alternateBgColor?: [number, number, number];
  fontSize?: number;
  fontFamily?: string;
}

// ============================================================================
// DEFAULT STYLES
// ============================================================================

const DEFAULT_STYLES: PDFStyles = {
  primaryColor: [31, 78, 121], // Dark blue
  headerBgColor: [41, 128, 185], // Blue header
  headerTextColor: [255, 255, 255], // White text
  alternateBgColor: [245, 245, 245], // Light gray for alternating rows
  fontSize: 10,
  fontFamily: 'helvetica',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date for Brazilian locale
 */
export function formatDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
}

/**
 * Format short date for Brazilian locale
 */
export function formatShortDateBR(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

/**
 * Format period label
 */
export function formatPeriodLabel(start: string, end: string): string {
  return `${formatShortDateBR(start)} - ${formatShortDateBR(end)}`;
}

// ============================================================================
// PDF DOCUMENT CREATION
// ============================================================================

/**
 * Create a new PDF document with Brazilian A4 format
 */
export function createPDFDocument(orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  return new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });
}

/**
 * Add header to PDF document
 */
export function addPDFHeader(
  doc: jsPDF,
  header: PDFHeader,
  styles: PDFStyles = DEFAULT_STYLES
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // School name
  if (header.schoolName) {
    doc.setFontSize(12);
    doc.setFont(styles.fontFamily || 'helvetica', 'bold');
    doc.setTextColor(...(styles.primaryColor || [0, 0, 0]));
    doc.text(header.schoolName, pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
  }

  // Title
  doc.setFontSize(16);
  doc.setFont(styles.fontFamily || 'helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(header.title, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // Subtitle
  if (header.subtitle) {
    doc.setFontSize(12);
    doc.setFont(styles.fontFamily || 'helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(header.subtitle, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  // Period
  if (header.period) {
    doc.setFontSize(10);
    doc.setFont(styles.fontFamily || 'helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const periodText = `Período: ${formatPeriodLabel(header.period.start, header.period.end)}`;
    doc.text(periodText, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
  }

  // Horizontal line
  currentY += 2;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(15, currentY, pageWidth - 15, currentY);
  currentY += 5;

  return currentY;
}

/**
 * Add footer to all pages
 */
export function addPDFFooter(
  doc: jsPDF,
  footer: PDFFooter = { showPageNumbers: true, showGeneratedAt: true }
): void {
  const pageCount = doc.internal.pages.length - 1;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);

    // Page numbers
    if (footer.showPageNumbers) {
      const pageText = `Página ${i} de ${pageCount}`;
      doc.text(pageText, pageWidth - 20, pageHeight - 10, { align: 'right' });
    }

    // Generated at
    if (footer.showGeneratedAt) {
      const generatedText = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`;
      doc.text(generatedText, 15, pageHeight - 10);
    }

    // Custom text
    if (footer.customText) {
      doc.text(footer.customText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  }
}

/**
 * Add a table to the PDF document
 */
export function addPDFTable(
  doc: jsPDF,
  table: PDFTableData,
  startY: number,
  styles: PDFStyles = DEFAULT_STYLES
): number {
  // Add table title if provided
  if (table.title) {
    doc.setFontSize(12);
    doc.setFont(styles.fontFamily || 'helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(table.title, 15, startY);
    startY += 8;
  }

  // Prepare columns for autoTable
  const columns = table.columns.map((col) => ({
    header: col.header,
    dataKey: col.dataKey,
  }));

  // Configure column styles
  const columnStyles: Record<string, any> = {};
  table.columns.forEach((col) => {
    columnStyles[col.dataKey] = {
      halign: col.halign || 'left',
      cellWidth: col.width || 'auto',
    };
  });

  // Add table using autoTable
  autoTable(doc, {
    startY,
    head: [table.columns.map((c) => c.header)],
    body: table.rows.map((row) => table.columns.map((c) => row[c.dataKey] ?? '')),
    headStyles: {
      fillColor: styles.headerBgColor || [41, 128, 185],
      textColor: styles.headerTextColor || [255, 255, 255],
      fontStyle: 'bold',
      fontSize: styles.fontSize || 10,
    },
    bodyStyles: {
      fontSize: styles.fontSize || 10,
    },
    alternateRowStyles: {
      fillColor: styles.alternateBgColor || [245, 245, 245],
    },
    columnStyles,
    margin: { left: 15, right: 15 },
    theme: 'striped',
  });

  // Get the final Y position
  const finalY = (doc as any).lastAutoTable?.finalY || startY + 20;

  // Add summary if provided
  if (table.summary) {
    doc.setFontSize(9);
    doc.setFont(styles.fontFamily || 'helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(table.summary, 15, finalY + 5);
    return finalY + 10;
  }

  return finalY;
}

/**
 * Add a summary section with key metrics
 */
export function addPDFSummary(
  doc: jsPDF,
  title: string,
  metrics: Array<{ label: string; value: string | number; color?: [number, number, number] }>,
  startY: number,
  styles: PDFStyles = DEFAULT_STYLES
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxWidth = (pageWidth - 40) / metrics.length;
  let currentX = 15;

  // Title
  doc.setFontSize(12);
  doc.setFont(styles.fontFamily || 'helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title, 15, startY);
  startY += 8;

  // Metric boxes
  metrics.forEach((metric) => {
    // Box background
    doc.setFillColor(metric.color?.[0] || 245, metric.color?.[1] || 245, metric.color?.[2] || 245);
    doc.roundedRect(currentX, startY, boxWidth - 5, 20, 2, 2, 'F');

    // Metric value
    doc.setFontSize(14);
    doc.setFont(styles.fontFamily || 'helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(String(metric.value), currentX + (boxWidth - 5) / 2, startY + 10, { align: 'center' });

    // Metric label
    doc.setFontSize(8);
    doc.setFont(styles.fontFamily || 'helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(metric.label, currentX + (boxWidth - 5) / 2, startY + 16, { align: 'center' });

    currentX += boxWidth;
  });

  return startY + 28;
}

/**
 * Add text section
 */
export function addPDFText(
  doc: jsPDF,
  text: string,
  startY: number,
  options: {
    fontSize?: number;
    fontStyle?: 'normal' | 'bold' | 'italic';
    color?: [number, number, number];
    maxWidth?: number;
  } = {}
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = options.maxWidth || pageWidth - 30;

  doc.setFontSize(options.fontSize || 10);
  doc.setFont('helvetica', options.fontStyle || 'normal');
  doc.setTextColor(...(options.color || [0, 0, 0]));

  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, 15, startY);

  return startY + lines.length * 5;
}

/**
 * Save PDF document with proper filename
 */
export function savePDF(doc: jsPDF, filename: string): void {
  // Add .pdf extension if not present
  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(name);
}

/**
 * Get PDF as blob for preview or upload
 */
export function getPDFBlob(doc: jsPDF): Blob {
  return doc.output('blob');
}

/**
 * Get PDF as base64 string
 */
export function getPDFBase64(doc: jsPDF): string {
  return doc.output('datauristring');
}
