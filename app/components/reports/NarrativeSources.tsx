'use client'

import { useEffect, useState } from 'react'
import { VivenciasReference } from '@/components/diary/VivenciasReference'
import { supabase } from '@/lib/supabase'
import { loadNarrativePreview, narrativeSnapshotSchema, type NarrativePreview } from '@/lib/reports/narrative-sources'
import type { Json } from '@/types/database'
import type { CampoType } from '@/types/diario-infantil'

interface SourcesProps {
  enrollmentId: string
  year: number
  semester: string
  finalized: boolean
  snapshot: Json | null
  onReady(ready: boolean): void
}

export function NarrativeSources({ enrollmentId, year, semester, finalized, snapshot, onReady }: SourcesProps) {
  const [preview, setPreview] = useState<NarrativePreview | null>(null)
  const [error, setError] = useState('')
  const [campo, setCampo] = useState<CampoType | null>(null)

  useEffect(() => {
    let active = true
    onReady(false)
    async function load() {
      try {
        if (finalized && snapshot === null) {
          if (active) setError('Relatório legado sem captura verificável de Vivências. Consulta preservada; nova emissão indisponível.')
          return
        }
        const loaded = finalized
          ? narrativeSnapshotSchema.parse(snapshot)
          : await loadNarrativePreview(supabase, enrollmentId, year, semester)
        if (!active) return
        setPreview(loaded)
        onReady(loaded.periodo !== null && loaded.fontes.length > 0)
      } catch {
        if (active) setError('Não foi possível consultar as fontes. A finalização está indisponível; tente reabrir o relatório.')
      }
    }
    void load()
    return () => { active = false }
  }, [enrollmentId, year, semester, finalized, snapshot, onReady])

  if (error) return <p role="alert" className="rounded-lg border p-4">{error}</p>
  if (!preview) return <p role="status">Carregando fontes do relatório...</p>
  if (!preview.periodo) return <p role="status" className="rounded-lg border p-4">Período escolar não configurado. Solicite à direção o cadastro das datas. O rascunho pode ser salvo, mas não finalizado.</p>

  return (
    <section aria-label="Fontes do relatório" className="min-w-0 space-y-3">
      <p className="text-sm font-medium">{preview.periodo.nome}: {preview.periodo.data_inicio} a {preview.periodo.data_fim}</p>
      <p role="status" className="text-sm">{finalized ? 'Captura imutável' : 'Prévia viva'}: {preview.fontes.length} Vivências. {finalized ? 'Alterações posteriores no diário não modificam esta cópia.' : 'Todas as fontes elegíveis serão capturadas na finalização.'}</p>
      {preview.fontes.length === 0 && <p role="alert">Nenhuma Vivência elegível. Registre ao menos uma fonte no período antes de finalizar.</p>}
      <div className="h-[28rem] overflow-hidden rounded-lg border"><VivenciasReference vivencias={preview.fontes} selectedCampo={campo} onFilterChange={setCampo} /></div>
    </section>
  )
}
