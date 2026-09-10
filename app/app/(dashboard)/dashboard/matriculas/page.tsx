'use client'

import { MatriculasPageContent } from '@/components/dashboard/matriculas-page-content'
import { supabase } from '@/lib/supabase'

export default function MatriculasPage() {
  return <MatriculasPageContent supabaseClient={supabase} />
}
