/**
 * @deprecated The daily frequency page was a divergent attendance journey.
 * Use /dashboard/turmas/[id]/chamada with sessoes_aula instead.
 */

import { redirect } from 'next/navigation'

export default function LegacyFrequenciaPage() {
  redirect('/dashboard/turmas')
}
