'use client'

import { NovaTurmaPageContent } from '@/components/dashboard/nova-turma-page-content'
import { useEscola } from '@/contexts/escola-context'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function NovaTurmaPage() {
  const router = useRouter()
  const escolaContext = useEscola()

  return (
    <NovaTurmaPageContent
      supabaseClient={supabase}
      router={router}
      escolaContext={escolaContext}
    />
  )
}
