import type { AppLocale } from './config'
import { applicationTimeZone } from './config'

export const dateTimeFormats = {
  short: {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: applicationTimeZone,
  },
  long: {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: applicationTimeZone,
  },
  time: {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: applicationTimeZone,
  },
} satisfies Record<string, Intl.DateTimeFormatOptions>

export const numberFormats = {
  integer: {
    maximumFractionDigits: 0,
  },
  decimal: {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  },
  percent: {
    style: 'percent',
    maximumFractionDigits: 1,
  },
  currencyBRL: {
    style: 'currency',
    currency: 'BRL',
  },
} satisfies Record<string, Intl.NumberFormatOptions>

export const formats = {
  dateTime: dateTimeFormats,
  number: numberFormats,
}

export type DateTimeFormatName = keyof typeof dateTimeFormats
export type NumberFormatName = keyof typeof numberFormats

/** Locale-aware formatter for non-React code. Prefer `useFormatter` in UI. */
export function formatDateForLocale(
  value: Date | number,
  locale: AppLocale,
  format: DateTimeFormatName = 'short'
): string {
  return new Intl.DateTimeFormat(locale, dateTimeFormats[format]).format(value)
}

/** Locale-aware formatter for non-React code. Prefer `useFormatter` in UI. */
export function formatNumberForLocale(
  value: number | bigint,
  locale: AppLocale,
  format: NumberFormatName = 'decimal'
): string {
  return new Intl.NumberFormat(locale, numberFormats[format]).format(value)
}
