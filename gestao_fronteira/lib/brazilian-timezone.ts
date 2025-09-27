/**
 * Brazilian Timezone Utilities
 * Handles São Paulo timezone operations for educational compliance
 * Implements Brazilian Daylight Saving Time rules
 */

import { format, formatDistanceToNow, addHours, subHours, startOfDay, endOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// São Paulo timezone offset (UTC-3, UTC-2 during DST)
const SAO_PAULO_TIMEZONE = 'America/Sao_Paulo'

/**
 * Get current time in São Paulo timezone
 */
export function getSaoPauloTime(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: SAO_PAULO_TIMEZONE }))
}

/**
 * Convert any date to São Paulo timezone
 */
export function toSaoPauloTime(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return new Date(dateObj.toLocaleString('en-US', { timeZone: SAO_PAULO_TIMEZONE }))
}

/**
 * Format time in São Paulo timezone with Brazilian locale
 */
export function formatSaoPauloTime(date: Date | string, formatString: string = 'HH:mm'): string {
  const saoPauloDate = toSaoPauloTime(date)
  return format(saoPauloDate, formatString, { locale: ptBR })
}

/**
 * Format full date and time in Brazilian format
 */
export function formatBrazilianDateTime(date: Date | string): string {
  const saoPauloDate = toSaoPauloTime(date)
  return format(saoPauloDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/**
 * Format date in Brazilian format (dd/MM/yyyy)
 */
export function formatBrazilianDate(date: Date | string): string {
  const saoPauloDate = toSaoPauloTime(date)
  return format(saoPauloDate, 'dd/MM/yyyy', { locale: ptBR })
}

/**
 * Get distance to now in Portuguese (Brazilian)
 */
export function getDistanceToNowBrazilian(date: Date | string, addSuffix: boolean = true): string {
  const saoPauloDate = toSaoPauloTime(date)
  return formatDistanceToNow(saoPauloDate, {
    locale: ptBR,
    addSuffix
  })
}

/**
 * Check if current São Paulo time is within business hours (8h-17h)
 */
export function isBusinessHours(): boolean {
  const now = getSaoPauloTime()
  const hour = now.getHours()
  return hour >= 8 && hour < 17
}

/**
 * Check if current São Paulo time is within school hours (7h-18h)
 */
export function isSchoolHours(): boolean {
  const now = getSaoPauloTime()
  const hour = now.getHours()
  return hour >= 7 && hour < 18
}

/**
 * Get next 6 PM São Paulo time for auto-closure
 */
export function getNext6PMSaoPaulo(fromDate?: Date | string): Date {
  const baseDate = fromDate ? toSaoPauloTime(fromDate) : getSaoPauloTime()
  const today6PM = new Date(baseDate)
  today6PM.setHours(18, 0, 0, 0)

  // If it's already past 6 PM today, return tomorrow's 6 PM
  if (baseDate.getTime() >= today6PM.getTime()) {
    const tomorrow6PM = new Date(today6PM)
    tomorrow6PM.setDate(tomorrow6PM.getDate() + 1)
    return tomorrow6PM
  }

  return today6PM
}

/**
 * Calculate time until 6 PM São Paulo (for auto-closure warning)
 */
export function getTimeUntil6PM(): {
  timeUntilClosure: string
  minutesUntilClosure: number
  isOverdue: boolean
  shouldWarn: boolean
} {
  const now = getSaoPauloTime()
  const next6PM = getNext6PMSaoPaulo(now)

  const diffMs = next6PM.getTime() - now.getTime()
  const minutesUntilClosure = Math.floor(diffMs / (1000 * 60))

  const isOverdue = diffMs <= 0
  const shouldWarn = !isOverdue && minutesUntilClosure <= 60 // Warn within 1 hour

  let timeUntilClosure: string

  if (isOverdue) {
    timeUntilClosure = 'Passou das 18h - Sessão deve ser fechada'
  } else if (minutesUntilClosure < 60) {
    timeUntilClosure = `${minutesUntilClosure} minuto${minutesUntilClosure !== 1 ? 's' : ''}`
  } else {
    const hours = Math.floor(minutesUntilClosure / 60)
    const minutes = minutesUntilClosure % 60
    timeUntilClosure = `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`
  }

  return {
    timeUntilClosure,
    minutesUntilClosure,
    isOverdue,
    shouldWarn
  }
}

/**
 * Check if a date is a Brazilian holiday or weekend
 */
export function isBrazilianHoliday(date: Date | string): boolean {
  const checkDate = toSaoPauloTime(date)
  const month = checkDate.getMonth() + 1 // getMonth() returns 0-11
  const day = checkDate.getDate()
  const dayOfWeek = checkDate.getDay() // 0 = Sunday, 6 = Saturday

  // Check weekends
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true
  }

  // Check fixed Brazilian holidays
  const fixedHolidays = [
    '01/01', // New Year
    '21/04', // Tiradentes
    '01/05', // Labor Day
    '07/09', // Independence Day
    '12/10', // Our Lady of Aparecida
    '02/11', // All Souls' Day
    '15/11', // Proclamation of the Republic
    '25/12'  // Christmas
  ]

  const dateString = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`

  return fixedHolidays.includes(dateString)
}

/**
 * Get next business day in São Paulo timezone
 */
export function getNextBusinessDay(fromDate?: Date | string): Date {
  let nextDay = fromDate ? toSaoPauloTime(fromDate) : getSaoPauloTime()
  nextDay = new Date(nextDay)
  nextDay.setDate(nextDay.getDate() + 1)

  while (isBrazilianHoliday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1)
  }

  return nextDay
}

/**
 * Check if session should be automatically closed
 */
export function shouldAutoCloseSession(sessionDate: Date | string, sessionOpenTime?: Date | string): boolean {
  const sessionDay = startOfDay(toSaoPauloTime(sessionDate))
  const currentDay = startOfDay(getSaoPauloTime())
  const current6PM = getNext6PMSaoPaulo(sessionDate)
  const now = getSaoPauloTime()

  // If session is from a previous day, it should be closed
  if (sessionDay.getTime() < currentDay.getTime()) {
    return true
  }

  // If it's the same day and past 6 PM, should be closed
  if (sessionDay.getTime() === currentDay.getTime() && now.getTime() >= current6PM.getTime()) {
    return true
  }

  return false
}

/**
 * Validate if time is within allowed session creation window
 */
export function validateSessionCreationTime(sessionDate: Date | string): {
  isValid: boolean
  reason?: string
} {
  const sessionDay = startOfDay(toSaoPauloTime(sessionDate))
  const today = startOfDay(getSaoPauloTime())
  const maxFutureDate = new Date(today)
  maxFutureDate.setDate(maxFutureDate.getDate() + 30)
  const minPastDate = new Date(today)
  minPastDate.setDate(minPastDate.getDate() - 7)

  // Check if too far in the future
  if (sessionDay.getTime() > maxFutureDate.getTime()) {
    return {
      isValid: false,
      reason: 'Não é possível criar sessões com mais de 30 dias de antecedência'
    }
  }

  // Check if too far in the past
  if (sessionDay.getTime() < minPastDate.getTime()) {
    return {
      isValid: false,
      reason: 'Não é possível criar sessões com mais de 7 dias no passado'
    }
  }

  // Check if it's a holiday/weekend
  if (isBrazilianHoliday(sessionDate)) {
    return {
      isValid: false,
      reason: 'Não é possível criar sessões em fins de semana ou feriados'
    }
  }

  return { isValid: true }
}

/**
 * Get school calendar information for a date
 */
export function getSchoolCalendarInfo(date: Date | string): {
  isSchoolDay: boolean
  isHoliday: boolean
  dayType: 'weekday' | 'weekend' | 'holiday'
  formattedDate: string
} {
  const checkDate = toSaoPauloTime(date)
  const isHoliday = isBrazilianHoliday(checkDate)
  const dayOfWeek = checkDate.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

  return {
    isSchoolDay: !isHoliday && !isWeekend,
    isHoliday,
    dayType: isHoliday ? 'holiday' : isWeekend ? 'weekend' : 'weekday',
    formattedDate: formatBrazilianDate(checkDate)
  }
}

/**
 * Create timezone-aware ISO string for database storage
 */
export function toISOStringBrazil(date: Date | string): string {
  const saoPauloDate = toSaoPauloTime(date)
  return saoPauloDate.toISOString()
}

/**
 * Parse ISO string to São Paulo timezone
 */
export function fromISOStringBrazil(isoString: string): Date {
  return toSaoPauloTime(new Date(isoString))
}

/**
 * Get current academic year based on Brazilian school calendar
 */
export function getCurrentAcademicYear(): number {
  const now = getSaoPauloTime()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Brazilian school year typically starts in February
  // If it's January, we're still in the previous academic year
  if (currentMonth === 1) {
    return currentYear - 1
  }

  return currentYear
}

/**
 * Format academic year display
 */
export function formatAcademicYear(year?: number): string {
  const academicYear = year || getCurrentAcademicYear()
  return `Ano Letivo ${academicYear}`
}

/**
 * Get warning message for session closure
 */
export function getClosureWarningMessage(): string | null {
  const { shouldWarn, timeUntilClosure, isOverdue } = getTimeUntil6PM()

  if (isOverdue) {
    return 'Atenção: Passou das 18h. Esta sessão deveria ter sido fechada.'
  }

  if (shouldWarn) {
    return `Atenção: Sessão será fechada automaticamente em ${timeUntilClosure}.`
  }

  return null
}

/**
 * Export all utilities as default object
 */
export default {
  getSaoPauloTime,
  toSaoPauloTime,
  formatSaoPauloTime,
  formatBrazilianDateTime,
  formatBrazilianDate,
  getDistanceToNowBrazilian,
  isBusinessHours,
  isSchoolHours,
  getNext6PMSaoPaulo,
  getTimeUntil6PM,
  isBrazilianHoliday,
  getNextBusinessDay,
  shouldAutoCloseSession,
  validateSessionCreationTime,
  getSchoolCalendarInfo,
  toISOStringBrazil,
  fromISOStringBrazil,
  getCurrentAcademicYear,
  formatAcademicYear,
  getClosureWarningMessage
}