import { redirect } from 'next/navigation'

interface DashboardDiarioRedirectProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Redirects the retired dashboard diary path to the canonical diary route. */
export default async function DashboardDiarioRedirect({
  searchParams,
}: DashboardDiarioRedirectProps) {
  const params = await searchParams
  const turma = Array.isArray(params.turma) ? params.turma[0] : params.turma
  redirect(turma ? `/diario?turma=${encodeURIComponent(turma)}` : '/diario')
}
