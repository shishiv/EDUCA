/**
 * Brazilian Date Formatting Utilities
 *
 * Consistent date formatting throughout the application,
 * following Brazilian conventions (DD/MM/YYYY).
 */

import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Format date to Brazilian format (DD/MM/YYYY)
 */
export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Format date with time (DD/MM/YYYY HH:mm)
 */
export function formatDateTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/**
 * Format date in short format (DD/MM)
 */
export function formatDateShortBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return format(parsed, 'dd/MM', { locale: ptBR })
}

/**
 * Format date with day of week (Segunda, 01/01/2024)
 */
export function formatDateWithWeekdayBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return format(parsed, "EEEE, dd/MM/yyyy", { locale: ptBR })
}

/**
 * Format date in month/year (Janeiro 2024)
 */
export function formatMonthYearBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return format(parsed, 'MMMM yyyy', { locale: ptBR })
}

/**
 * Format relative time ("há 2 dias", "há 1 hora")
 */
export function formatRelativeTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR })
}

/**
 * Format time only (HH:mm)
 */
export function formatTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = date instanceof Date ? date : parseISO(date)
  if (!isValid(parsed)) return '-'

  return format(parsed, 'HH:mm', { locale: ptBR })
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/** Return inclusive ISO-date bounds for the UTC calendar month containing now. */
export function getCurrentUtcMonthRange(now: Date = new Date()) {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  return {
    startDate: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    endDate: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10),
  }
}

/**
 * Get today's date in the São Paulo timezone (YYYY-MM-DD).
 */
export function getTodaySaoPaulo(): string {
  const now = new Date()
  const saoPauloFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return saoPauloFormatter.format(now)
}

/**
 * Return today's São Paulo calendar date without inheriting the host timezone.
 */
export function getTodaySaoPauloDate(): Date {
  const [year, month, day] = getTodaySaoPaulo().split('-').map(Number)
  return new Date(year, month - 1, day)
}
