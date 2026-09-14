import { SelectItem } from '@/components/ui/select'
import type { SchoolPeriod } from '@/lib/services/school-periods'

export function SchoolPeriodChoices({ periods }: { periods: SchoolPeriod[] }) {
  return <>{periods.map(period => <SelectItem key={period.chave} value={period.chave}>{period.nome}</SelectItem>)}{periods.length === 0 && <SelectItem value="unconfigured" disabled>Períodos escolares não configurados</SelectItem>}</>
}

export function SchoolPeriodNotice({ periods, error }: { periods: SchoolPeriod[]; error: string }) {
  if (periods.length > 0) return null
  return <p role="status" className="text-sm text-muted-foreground">{error || 'Selecione uma turma com períodos cadastrados pela direção. Mês civil e intervalo personalizado continuam disponíveis.'}</p>
}
