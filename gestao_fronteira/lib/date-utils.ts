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

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return format(parsed, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Format date with time (DD/MM/YYYY HH:mm)
 */
export function formatDateTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return format(parsed, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/**
 * Format date in short format (DD/MM)
 */
export function formatDateShortBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return format(parsed, 'dd/MM', { locale: ptBR })
}

/**
 * Format date with day of week (Segunda, 01/01/2024)
 */
export function formatDateWithWeekdayBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return format(parsed, "EEEE, dd/MM/yyyy", { locale: ptBR })
}

/**
 * Format date in month/year (Janeiro 2024)
 */
export function formatMonthYearBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return format(parsed, 'MMMM yyyy', { locale: ptBR })
}

/**
 * Format relative time ("há 2 dias", "há 1 hora")
 */
export function formatRelativeTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return formatDistanceToNow(parsed, { addSuffix: true, locale: ptBR })
}

/**
 * Format time only (HH:mm)
 */
export function formatTimeBR(date: string | Date | null | undefined): string {
  if (!date) return '-'

  const parsed = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(parsed)) return '-'

  return format(parsed, 'HH:mm', { locale: ptBR })
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function getTodayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Get current São Paulo time (Brazil/East timezone)
 */
export function getSaoPauloTime(): Date {
  const now = new Date()
  const saoPauloFormatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = saoPauloFormatter.formatToParts(now)
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0'

  return new Date(
    parseInt(get('year')),
    parseInt(get('month')) - 1,
    parseInt(get('day')),
    parseInt(get('hour')),
    parseInt(get('minute')),
    parseInt(get('second'))
  )
}

/**
 * Check if current São Paulo time is past 18:00 (attendance lock rule)
 */
export function isPast18hSaoPaulo(): boolean {
  const spTime = getSaoPauloTime()
  return spTime.getHours() >= 18
}
