import { startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns'
import type { SchoolPeriod } from '@/lib/services/school-periods'

/** Civil shortcuts are not school periods. Unknown school keys never get guessed dates. */
export function reportPeriodDates(key: string, periods: SchoolPeriod[], today = new Date()) {
  if (key === 'current_month') return { from: startOfMonth(today), to: endOfMonth(today) }
  if (key === 'last_month') {
    const previous = subMonths(today, 1)
    return { from: startOfMonth(previous), to: endOfMonth(previous) }
  }
  const period = periods.find(item => item.chave === key)
  return period ? { from: parseISO(period.data_inicio), to: parseISO(period.data_fim) } : null
}
